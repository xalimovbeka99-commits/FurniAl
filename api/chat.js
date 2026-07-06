/**
 * POST /api/chat
 * Body: { messages: [{role:'user'|'assistant', content:string}, ...], currentConfig?: object }
 * Returns: { reply: string, config: object|null }
 *
 * AI Furniture Designer for the FurniAI configurator (static site, no framework).
 * Stateless — the client resends the full conversation each turn.
 *
 * Vocabulary here mirrors the LIVE configurator's cfg shape exactly
 * (type/sections/drawers/shelves/doorType/mat/handle/led/w/h/d in DESIGNS,
 * index.html) — NOT the different schema used by the in-development Next.js
 * app in src/. Do not merge these two vocabularies.
 */
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-sonnet-4-6';

const TYPES = ['wardrobe','walkin_l','walkin_u','kitchen','kitchen_l','kitchen_u','kitchen_island','vanity_freestanding','vanity_floating','bookshelf','sideboard'];
const MATERIALS = ['oak','walnut','white','grey','taupe','cream'];
const HANDLES = ['gold','black','chrome','push','none'];
const DOOR_TYPES = ['glass','solid','mirror','open'];
const LED_MODES = ['warm','cool','off'];

// Matches the per-type slider ranges set in index.html Builder.load()
const RANGES = {
  wardrobe:{w:[120,360],h:[180,280],d:[40,80]},
  walkin_l:{w:[120,360],h:[180,280],d:[40,80]},
  walkin_u:{w:[120,360],h:[180,280],d:[40,80]},
  kitchen:{w:[120,360],h:[180,250],d:[50,70]},
  kitchen_l:{w:[120,360],h:[180,250],d:[50,70]},
  kitchen_u:{w:[120,360],h:[180,250],d:[50,70]},
  kitchen_island:{w:[120,360],h:[180,250],d:[50,70]},
  vanity_freestanding:{w:[60,240],h:[45,100],d:[40,65]},
  vanity_floating:{w:[60,240],h:[45,100],d:[40,65]},
  bookshelf:{w:[60,240],h:[150,240],d:[25,50]},
  sideboard:{w:[100,240],h:[45,100],d:[35,55]},
};

const SYSTEM_PROMPT=`You are the AI Furniture Designer for FurniAI, a browser-based custom-furniture design application — not a store, it never shows prices.
You help people design real, manufacturable furniture through conversation, then hand off a parametric model to a live 3D configurator.

Voice: concise, expert, a little inspiring — like a good interior designer. No emoji unless the user uses them first.

Your job each turn:
1. Understand the furniture the user wants: type, rough size, style, materials, doors, drawers, shelves, handles, lighting.
2. As soon as you can identify at least a furniture TYPE, call the set_furniture_config tool. Don't interrogate the user for every field — use sensible defaults for anything unstated. Ask at most one clarifying question, only if genuinely ambiguous.
3. When refining an existing design ("make it wider", "add a drawer", "change to walnut"), call set_furniture_config again with the FULL updated config — carry over every field from the current config, changing only what the user asked.
4. After the tool result comes back, reply with a short, natural confirmation of what you built or changed — describe it like a designer would, don't recite raw numbers robotically.

Vocabulary you must map onto:
- Furniture types: ${TYPES.join(', ')} (walkin_l/walkin_u = L/U-shaped walk-in closets; kitchen_l/kitchen_u/kitchen_island = kitchen layouts; vanity_freestanding/vanity_floating = bathroom vanities)
- Materials: ${MATERIALS.join(', ')}
- Door types: ${DOOR_TYPES.join(', ')} (open = no doors, just open shelving)
- Handles: ${HANDLES.join(', ')} (push = handleless push-to-open, none = no handle hardware)
- LED: ${LED_MODES.join(', ')}
- Dimensions are in CENTIMETRES.

Never invent or mention a price — this application does not show prices.`;

const CONFIG_TOOL={
  name:'set_furniture_config',
  description:'Create or update the parametric furniture model shown in the 3D configurator. Always pass the complete config (all fields), even when only changing one thing.',
  input_schema:{
    type:'object',
    properties:{
      name:{type:'string',description:'Short display name, e.g. "Modern Oak Wardrobe"'},
      type:{type:'string',enum:TYPES},
      sections:{type:'integer',minimum:1,maximum:6},
      drawers:{type:'integer',minimum:0,maximum:6},
      shelves:{type:'integer',minimum:0,maximum:7},
      doorType:{type:'string',enum:DOOR_TYPES},
      mat:{type:'string',enum:MATERIALS},
      handle:{type:'string',enum:HANDLES},
      led:{type:'string',enum:LED_MODES},
      w:{type:'number',description:'width in cm'},
      h:{type:'number',description:'height in cm'},
      d:{type:'number',description:'depth in cm'},
    },
    required:['type','sections','drawers','shelves','doorType','mat','handle','led','w','h','d'],
    additionalProperties:false,
  },
};

function oneOf(v,allowed,fallback){return allowed.includes(v)?v:fallback}
function clampInt(v,min,max,fallback){const n=Math.round(Number(v));if(!Number.isFinite(n))return fallback;return Math.min(max,Math.max(min,n))}
function clampNum(v,min,max,fallback){const n=Number(v);if(!Number.isFinite(n))return fallback;return Math.min(max,Math.max(min,n))}

// Defense-in-depth: never let raw model output drive geometry directly.
// Every field is validated against the known vocabulary and clamped to a
// manufacturable range before it ever reaches the 3D builder.
function sanitizeConfig(raw){
  const type=oneOf(raw.type,TYPES,'wardrobe');
  const range=RANGES[type];
  return {
    name:typeof raw.name==='string'&&raw.name.trim()?raw.name.trim().slice(0,60):'AI Design',
    type,
    sections:clampInt(raw.sections,1,6,4),
    drawers:clampInt(raw.drawers,0,6,0),
    shelves:clampInt(raw.shelves,0,7,3),
    doorType:oneOf(raw.doorType,DOOR_TYPES,'solid'),
    mat:oneOf(raw.mat,MATERIALS,'oak'),
    handle:oneOf(raw.handle,HANDLES,'black'),
    led:oneOf(raw.led,LED_MODES,'warm'),
    w:clampNum(raw.w,range.w[0],range.w[1],Math.round((range.w[0]+range.w[1])/2)),
    h:clampNum(raw.h,range.h[0],range.h[1],Math.round((range.h[0]+range.h[1])/2)),
    d:clampNum(raw.d,range.d[0],range.d[1],Math.round((range.d[0]+range.d[1])/2)),
  };
}

module.exports = async (req,res)=>{
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return}
  if(!process.env.ANTHROPIC_API_KEY){res.status(500).json({error:'ANTHROPIC_API_KEY is not set on the server'});return}

  let body=req.body;
  if(!body||typeof body==='string'){
    try{body=JSON.parse(body||'{}')}catch{body={}}
  }
  const messages=Array.isArray(body.messages)?body.messages:null;
  if(!messages||messages.length===0){res.status(400).json({error:'Body must include a non-empty messages array'});return}

  const anthropic=new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY});
  const apiMessages=messages.map(m=>({role:m.role,content:m.content}));

  let config=null;
  try{
    for(let hop=0;hop<3;hop++){
      const resp=await anthropic.messages.create({
        model:MODEL,
        max_tokens:1024,
        system:SYSTEM_PROMPT,
        tools:[CONFIG_TOOL],
        messages:apiMessages,
      });

      if(resp.stop_reason==='tool_use'){
        apiMessages.push({role:'assistant',content:resp.content});
        const toolResults=[];
        for(const block of resp.content){
          if(block.type!=='tool_use')continue;
          if(block.name==='set_furniture_config'){
            config=sanitizeConfig(block.input||{});
            toolResults.push({type:'tool_result',tool_use_id:block.id,content:JSON.stringify({applied:config})});
          }
        }
        apiMessages.push({role:'user',content:toolResults});
        continue;
      }

      const reply=resp.content.filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
      res.status(200).json({reply,config});
      return;
    }
    res.status(200).json({
      reply:config?"Here's your design — tell me what to change next.":'Tell me a bit more about the piece you have in mind.',
      config,
    });
  }catch(err){
    console.error('chat agent error:',err);
    res.status(500).json({error:'Agent failed'});
  }
};

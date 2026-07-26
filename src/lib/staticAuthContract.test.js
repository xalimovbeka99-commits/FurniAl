import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";


const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
const authStart = html.indexOf("/* ===== Auth + saved projects (Supabase) ===== */");
const authEnd = html.indexOf("async function saveCurrentDesign()", authStart);
const authSource = html.slice(authStart, authEnd);


function element(overrides = {}) {
  return {
    hidden: false,
    textContent: "",
    value: "",
    disabled: false,
    innerHTML: "",
    autocomplete: "",
    dataset: {},
    addEventListener() {},
    ...overrides,
  };
}


function authHarness(authOverrides = {}) {
  const elements = {
    authBtn: element(),
    authUserBar: element(),
    authUserName: element(),
    authModal: element({ hidden: false }),
    authTitle: element(),
    authSubmitBtn: element(),
    authToggle: element(),
    authToggleLink: element(),
    authEmail: element(),
    authPassword: element(),
    authError: element(),
    authGoogleBtn: element(),
    authAppleBtn: element(),
    authDivider: element(),
  };
  const auth = {
    onAuthStateChange() {},
    getSession: async () => ({ data: { session: null } }),
    signInWithPassword: async () => ({ data: { session: {} }, error: null }),
    signUp: async () => ({ data: { session: null }, error: null }),
    signInWithOAuth: async () => ({ data: null, error: null }),
    signOut: async () => {},
    ...authOverrides,
  };
  const context = vm.createContext({
    window: {
      supabase: {
        createClient: () => ({ auth }),
      },
    },
    document: {
      getElementById: (id) => elements[id] ?? null,
    },
    location: { origin: "https://furnia.vercel.app" },
    alert() {},
    go() {},
    console,
  });
  vm.runInContext(authSource, context);
  context.initAuth();
  return { auth, context, elements };
}


describe("live static auth contract", () => {
  it("hides OAuth controls until their Supabase providers are enabled", () => {
    const { context, elements } = authHarness();

    context.configureAuthProviders();

    expect(elements.authGoogleBtn.hidden).toBe(true);
    expect(elements.authAppleBtn.hidden).toBe(true);
    expect(elements.authDivider.hidden).toBe(true);
    expect(html).toContain('id="authError" role="status" aria-live="polite"');
  });

  it("keeps signup open and explains email confirmation", async () => {
    let submitted;
    const { context, elements } = authHarness({
      signUp: async (payload) => {
        submitted = payload;
        return { data: { user: { id: "user-1" }, session: null }, error: null };
      },
    });
    elements.authEmail.value = "customer@example.com";
    elements.authPassword.value = "strong-password";
    context.setAuthMode("signup");

    await context.submitAuthForm();

    expect(elements.authModal.hidden).toBe(false);
    expect(elements.authError.dataset.kind).toBe("success");
    expect(elements.authError.textContent).toContain("Check your email");
    expect(elements.authPassword.value).toBe("");
    expect(submitted.options.emailRedirectTo).toBe("https://furnia.vercel.app");
  });

  it("shows password sign-in errors instead of closing the modal", async () => {
    const { context, elements } = authHarness({
      signInWithPassword: async () => ({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      }),
    });
    elements.authEmail.value = "customer@example.com";
    elements.authPassword.value = "wrong-password";
    context.setAuthMode("signin");

    await context.submitAuthForm();

    expect(elements.authModal.hidden).toBe(false);
    expect(elements.authError.dataset.kind).toBe("error");
    expect(elements.authError.textContent).toBe("Invalid login credentials");
  });

  it("explains that a disabled OAuth provider is unavailable", async () => {
    let oauthCalls = 0;
    const { context, elements } = authHarness({
      signInWithOAuth: async () => {
        oauthCalls += 1;
        return { data: null, error: null };
      },
    });

    await context.signInWithGoogle();

    expect(oauthCalls).toBe(0);
    expect(elements.authError.dataset.kind).toBe("info");
    expect(elements.authError.textContent).toContain("not available yet");
  });
});

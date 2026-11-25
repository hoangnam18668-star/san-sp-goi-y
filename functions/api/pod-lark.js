/* Cloudflare Pages Function: GET /api/pod-lark
   Đọc bảng Lark "FULLFILLMENT (THẢO)" (chỉ XEM) bằng ứng dụng Lark, trả về lưới ô của các tab tháng.
   Khoá ứng dụng KHÔNG nằm trong mã: đặt ở Cloudflare → Pages → nexa-commerce → Settings → Variables and Secrets:
     LARK_APP_ID, LARK_APP_SECRET (loại Secret). Tuỳ chọn: LARK_WIKI_TOKEN, LARK_HOST.
   Chỉ tài khoản giám đốc (role owner trên Supabase) gọi được. */
const SUPA = "https://hcubziuqxgnfgxxixnam.supabase.co";
const SUPA_KEY = "sb_publishable_-96LA7syIP-8numUZEApVA_22Vv81bi"; // khoá công khai (publishable), không phải khoá bí mật
// wiki: trang wiki (cần tra obj_token); sheet: bảng trong Drive (token dùng thẳng)
const DOCS = { pod: { wiki: "HdpOwILOvi99xjkVFXsjRvLQpDg" }, thuchi: { wiki: "WyOIw5VyjiqG8ukfZA7j0ND0pYf" }, payout: { sheet: "Ozv2sJC5fh2A63td6tDjmPe7pMe" }, podcloth: { sheet: "Qih0s35CAhByRItgin8j0FSUpUe" } };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const cell = v => v == null ? "" : Array.isArray(v) ? v.map(cell).join("") : typeof v === "object" ? String(v.text ?? v.link ?? v.value ?? "") : String(v);
const col = n => { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s };

export async function onRequestGet({ request, env }) {
  try {
    /* 1) Kiểm tra người gọi là giám đốc */
    const tok = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!tok) return J({ error: "Chưa đăng nhập" }, 401);
    const h = { apikey: SUPA_KEY, authorization: "Bearer " + tok };
    const u = await fetch(SUPA + "/auth/v1/user", { headers: h });
    if (!u.ok) return J({ error: "Phiên đăng nhập hết hạn" }, 401);
    const uid = (await u.json()).id;
    const m = await (await fetch(`${SUPA}/rest/v1/app_members?select=role&user_id=eq.${uid}`, { headers: h })).json();
    if (m?.[0]?.role !== "owner") return J({ error: "Chỉ tài khoản giám đốc" }, 403);
    if (!env.LARK_APP_ID || !env.LARK_APP_SECRET) return J({ error: "Chưa cài LARK_APP_ID / LARK_APP_SECRET trên Cloudflare Pages", code: "noenv" }, 500);

    /* 2) Lấy token ứng dụng Lark */
    const base = "https://" + (env.LARK_HOST || "open.larksuite.com") + "/open-apis";
    const t = await (await fetch(base + "/auth/v3/tenant_access_token/internal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app_id: env.LARK_APP_ID, app_secret: env.LARK_APP_SECRET }) })).json();
    if (!t.tenant_access_token) return J({ error: "Lark từ chối App ID/Secret: " + (t.msg || t.code), code: "auth" }, 502);
    const L = { authorization: "Bearer " + t.tenant_access_token };
    const get = async p => { const r = await (await fetch(base + p, { headers: L })).json(); if (r.code) throw Object.assign(new Error(`Lark ${r.code}: ${r.msg}`), { lark: r.code }); return r.data };

    /* 3) Tìm bảng từ trang wiki, liệt kê tab */
    const url0 = new URL(request.url), docKey = DOCS[url0.searchParams.get("doc")] ? url0.searchParams.get("doc") : "pod";
    const D = DOCS[docKey], node = D.wiki ? (await get("/wiki/v2/spaces/get_node?token=" + D.wiki)).node : { obj_token: D.sheet, title: docKey };
    const sp = node.obj_token;
    const sheets = (await get(`/sheets/v3/spreadsheets/${sp}/sheets/query`)).sheets || [];
    const all = docKey === "thuchi" || url0.searchParams.get("all") === "1";
    const now = new Date(Date.now() + 7 * 36e5), want = new Set();
    for (const k of [0, 1]) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)); want.add(`${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`) }
    const pick = docKey === "payout" ? sheets : sheets.filter(s => { const mm = /^\s*t\s*(\d{1,2})\s*[./-]\s*(\d{4})/i.exec(s.title || ""); return mm && (all || want.has(`${+mm[1]}.${mm[2]}`)) });

    /* 4) Đọc giá trị từng tab */
    const tabs = [];
    for (const s of pick) {
      const rows = Math.min(s.grid_properties?.row_count || 200, 400), cols = Math.min(s.grid_properties?.column_count || 52, 80);
      const v = await get(`/sheets/v2/spreadsheets/${sp}/values/${s.sheet_id}!A1:${col(cols)}${rows}?valueRenderOption=FormattedValue&dateTimeRenderOption=FormattedString`);
      tabs.push({ tab: s.title, grid: (v.valueRange?.values || []).map(r => (r || []).map(cell)) });
    }
    return J({ title: node.title, tabs, allTabs: sheets.map(s => s.title), at: new Date().toISOString() });
  } catch (e) {
    const hint = [99991672, 99991663, 1254302, 131006, 91403].includes(e.lark) ? " – ứng dụng chưa được cấp quyền xem bảng (thêm ứng dụng làm người xem tài liệu, bật quyền sheets/wiki chỉ đọc)" : "";
    return J({ error: String(e.message || e) + hint, code: "lark" }, 502);
  }
}

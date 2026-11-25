/* Cloudflare Pages Function: GET /api/lenful
   Lấy giá xưởng từng đơn dép trên Lenful qua API chính thức (Lenful V6 API Seller):
   POST /api/seller/login (tài khoản + mật khẩu) → token → POST https://s-lencam-v3.lenful.com/api/order/list.
   Tài khoản KHÔNG nằm trong mã: giám đốc tự đặt ở Cloudflare → Pages → nexa-commerce → Settings → Variables and Secrets:
     LENFUL_USER (email/tên đăng nhập), LENFUL_PASS (loại Secret).
   Chỉ trả về: mã đơn (order_number = mã đơn TikTok), tổng tiền, ngày, trạng thái thanh toán. Không trả thông tin khách.
   Chỉ tài khoản giám đốc (role owner) gọi được. */
const SUPA = "https://hcubziuqxgnfgxxixnam.supabase.co";
const SUPA_KEY = "sb_publishable_-96LA7syIP-8numUZEApVA_22Vv81bi"; // khoá công khai (publishable)
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const firstArr = o => { if (Array.isArray(o)) return o; if (o && typeof o === "object") for (const k of ["data", "items", "orders", "list", "docs", "results"]) { const a = firstArr(o[k]); if (a) return a } return null };

export async function onRequestGet({ request, env }) {
  try {
    const tok = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!tok) return J({ error: "Chưa đăng nhập" }, 401);
    const h = { apikey: SUPA_KEY, authorization: "Bearer " + tok };
    const u = await fetch(SUPA + "/auth/v1/user", { headers: h });
    if (!u.ok) return J({ error: "Phiên đăng nhập hết hạn" }, 401);
    const uid = (await u.json()).id;
    const m = await (await fetch(`${SUPA}/rest/v1/app_members?select=role&user_id=eq.${uid}`, { headers: h })).json();
    if (m?.[0]?.role !== "owner") return J({ error: "Chỉ tài khoản giám đốc" }, 403);
    if (!env.LENFUL_USER || !env.LENFUL_PASS) return J({ error: "Chưa cài LENFUL_USER / LENFUL_PASS trên Cloudflare", code: "noenv" }, 500);

    /* Đăng nhập Lenful lấy token */
    const lr = await fetch("https://s-lencam.lenful.com/api/seller/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ user_name: env.LENFUL_USER, password: env.LENFUL_PASS }) });
    const lj = await lr.json().catch(() => ({}));
    const token = lj?.data?.token || lj?.token || lj?.data?.access_token || lj?.access_token || lj?.data?.accessToken;
    if (!token) return J({ error: "Lenful từ chối đăng nhập: " + (lj?.message || lr.status), code: "auth" }, 502);

    /* Lấy đơn 120 ngày gần nhất, tối đa 20 trang × 100 đơn */
    const to = new Date(), from = new Date(Date.now() - 120 * 864e5), d = x => x.toISOString().slice(0, 10);
    const fields = "id,order_number,payment_status,total_items,total_price,status,currency,created_at";
    const o = {}; let pages = 0;
    for (let page = 1; page <= 20; page++) {
      const r = await fetch(`https://s-lencam-v3.lenful.com/api/order/list?limit=100&page=${page}&fields=${fields}&sort_by=create_at_desc`, { method: "POST", headers: { "content-type": "application/json", accept: "*/*", authorization: token }, body: JSON.stringify({ keyword: "", keywordType: "everything", from_date: d(from), to_date: d(to), status: [] }) });
      const j = await r.json().catch(() => ({}));
      const arr = firstArr(j?.data ?? j) || [];
      if (!r.ok) return J({ error: "Lenful lỗi danh sách đơn: " + (j?.message || r.status), code: "list" }, 502);
      for (const x of arr) { const id = (String(x.order_number || "").match(/5\d{17}/) || [])[0]; if (!id) continue; const v = +x.total_price || 0; if (v) o[id] = [Math.round(v * 100) / 100, "Lenful", String(x.created_at || "").slice(0, 10), String(x.payment_status || "")] }
      pages = page; if (arr.length < 100) break;
    }
    return J({ o, n: Object.keys(o).length, pages, at: new Date().toISOString() });
  } catch (e) { return J({ error: "Lỗi máy chủ: " + e.message }, 500) }
}

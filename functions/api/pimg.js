/* GET /api/pimg?id=<mã sản phẩm SHEIN>  → chuyển tới ảnh sản phẩm (lấy og:image từ trang SHEIN, lưu cache 30 ngày).
   Chỉ nhận mã số, chỉ đọc trang us.shein.com – không phải proxy mở. */
export async function onRequestGet({ request, waitUntil }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^\d{5,12}$/.test(id)) return new Response("bad id", { status: 400 });
  const cache = caches.default, key = new Request("https://pimg.cache/shein/" + id);
  const dbg = new URL(request.url).searchParams.get("debug");
  const hit = dbg ? null : await cache.match(key); if (hit) return hit;
  let img = "";
  try {
    const slug = (new URL(request.url).searchParams.get("s") || "item").replace(/[^A-Za-z0-9-]/g, "").slice(0, 200) || "item";
    const r = await fetch(`https://us.shein.com/${slug}-p-${id}.html`, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", "accept-language": "en-US,en;q=0.9", accept: "text/html" }, redirect: "follow", cf: { cacheTtl: 86400 } });
    const h = (await r.text()).slice(0, 400000);
    if (dbg) return new Response(JSON.stringify({ status: r.status, url: r.url, len: h.length, title: (/<title>([^<]*)/i.exec(h) || [])[1], og: (/og:image[^>]*/i.exec(h) || [])[0], gi: (/"goods_img"[^,]*/.exec(h) || [])[0] }), { headers: { "content-type": "application/json" } });
    const m = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i.exec(h) || /"goods_img"\s*:\s*"([^"]+)"/.exec(h) || /"original_img"\s*:\s*"([^"]+)"/.exec(h);
    if (m) img = m[1].replace(/\\\//g, "/").replace(/^\/\//, "https://");
  } catch (e) {}
  const res = img ? new Response(null, { status: 302, headers: { location: img, "cache-control": "public, max-age=2592000" } })
                  : new Response("no image", { status: 404, headers: { "cache-control": "public, max-age=3600" } });
  waitUntil(cache.put(key, res.clone()));
  return res;
}

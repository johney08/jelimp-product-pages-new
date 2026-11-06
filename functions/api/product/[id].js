export async function onRequest({ request, env, params }) {
  const id = params.id;

  const headers = {
    "Content-Type": "text/html; charset=UTF-8",
    "Cache-Control": "public, max-age=60"
  };

  if (!id || !/^\d+$/.test(id)) {
    return new Response("Invalid product ID", {
      status: 400,
      headers
    });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response("Website configuration is incomplete.", {
      status: 500,
      headers
    });
  }

  const apiUrl =
    `${env.SUPABASE_URL}/rest/v1/product` +
    `?id=eq.${id}&select=name,price,description,category,location,image_url,media_type,seller_name&limit=1`;

  const result = await fetch(apiUrl, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    }
  });

  if (!result.ok) {
    return new Response("Unable to load product.", {
      status: 502,
      headers
    });
  }

  const products = await result.json();
  const product = products[0];

  if (!product) {
    return new Response("Product not found.", {
      status: 404,
      headers
    });
  }

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const name = escapeHTML(product.name);
  const description = escapeHTML(product.description);
  const price = escapeHTML(product.price);
  const seller = escapeHTML(product.seller_name || "JELIMp Seller");
  const image = product.image_url || "";
  const pageUrl = new URL(request.url).href;
  const safeImage = escapeHTML(image);

  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} | JELIMp</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${name} | JELIMp">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${safeImage}">
<meta property="og:url" content="${escapeHTML(pageUrl)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<style>
body{font-family:Arial,sans-serif;margin:0;background:#f3f6fb;color:#172b4d}
main{max-width:600px;margin:30px auto;background:white;padding:20px;border-radius:14px}
img{width:100%;max-height:420px;object-fit:contain;border-radius:10px}
h1{color:#0756a5}
.price{font-size:24px;font-weight:bold;color:#0756a5}
</style>
</head>
<body>
<main>
<h1>JELIMp</h1>
<img src="${safeImage}" alt="${name}">
<h2>${name}</h2>
<p class="price">${price}</p>
<p>${description}</p>
<p>Seller: ${seller}</p>
<p>Location: ${escapeHTML(product.location)}</p>
<p>Discover more on JELIMp.</p>
</main>
</body>
</html>`, { headers });
}


export async function onRequest(context) {
  const { request, env } = context;

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      "Website configuration is incomplete. Check the Supabase variables in Cloudflare.",
      { status: 500 }
    );
  }

  const id = new URL(request.url).pathname.split("/").pop();

  if (!/^\d+$/.test(id || "")) {
    return new Response("Invalid product ID.", { status: 400 });
  }

  try {
    const apiUrl = new URL(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/product`
    );

    apiUrl.searchParams.set("id", `eq.${id}`);
    apiUrl.searchParams.set(
      "select",
      "name,price,description,category,location,image_url,media_type,seller_name"
    );

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();

      return new Response(
        `Supabase request failed. HTTP ${response.status}: ${errorText.slice(0, 500)}`,
        {
          status: 502,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        }
      );
    }

    const products = await response.json();
    const product = products[0];

    if (!product) {
      return new Response("Product not found.", { status: 404 });
    }

    const escapeHtml = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]);

    const title = escapeHtml(`${product.name} | JELIMp`);
    const description = escapeHtml(
      `${product.description || product.name} | ${product.location || "JELIMp Marketplace"}`
    );
    const image = escapeHtml(product.image_url || "");
    const pageUrl = escapeHtml(request.url);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>

  <meta name="description" content="${description}">

  <meta property="og:type" content="product">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${pageUrl}">
  ${image ? `<meta property="og:image" content="${image}">` : ""}
  <meta property="og:site_name" content="JELIMp">

  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${image ? `<meta name="twitter:image" content="${image}">` : ""}

  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      color: #17345c;
    }
    img {
      width: 100%;
      border-radius: 12px;
    }
    h1 { color: #0756a5; }
    .price { font-size: 24px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>JELIMp</h1>
  <h2>${escapeHtml(product.name)}</h2>
  ${image ? `<img src="${image}" alt="${escapeHtml(product.name)}">` : ""}
  <p class="price">${escapeHtml(product.price)}</p>
  <p>${description}</p>
  <p>Category: ${escapeHtml(product.category)}</p>
  <p>Location: ${escapeHtml(product.location)}</p>
  <p>Seller: ${escapeHtml(product.seller_name)}</p>
  <p>Joining Enterprises, Linking Individuals, Markets & People.</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60"
      }
    });

  } catch (error) {
    return new Response(
      `Unable to load product. ${String(error.message || error)}`,
      {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      }
    );
  }
}

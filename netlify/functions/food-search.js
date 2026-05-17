const OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

export default async (req) => {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const query = String(url.searchParams.get('q') || '').trim();
  if (query.length < 2) {
    return json({ items: [] });
  }

  const searchUrl = new URL(OPEN_FOOD_FACTS_URL);
  searchUrl.searchParams.set('search_terms', query);
  searchUrl.searchParams.set('search_simple', '1');
  searchUrl.searchParams.set('action', 'process');
  searchUrl.searchParams.set('json', '1');
  searchUrl.searchParams.set('page_size', '12');
  searchUrl.searchParams.set('fields', 'code,product_name,brands,nutriments');

  try {
    const response = await fetch(searchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Reset testing calorie tracker - https://resetlifeproject.netlify.app',
      },
    });

    if (!response.ok) {
      return json({ error: 'Food database unavailable', items: [] }, 502);
    }

    const data = await response.json();
    const items = (Array.isArray(data.products) ? data.products : [])
      .map(normaliseProduct)
      .filter(Boolean)
      .slice(0, 8);

    return json({ items });
  } catch {
    return json({ error: 'Food database unavailable', items: [] }, 502);
  }
};

export const config = {
  path: '/api/food-search',
};

function normaliseProduct(product) {
  const caloriesPer100g = Math.round(Number(product?.nutriments?.['energy-kcal_100g']));
  const name = String(product?.product_name || '').trim();
  if (!name || !Number.isFinite(caloriesPer100g) || caloriesPer100g <= 0) return null;

  return {
    id: String(product.code || `${name}-${caloriesPer100g}`).slice(0, 80),
    name: name.slice(0, 80),
    brand: String(product.brands || '').split(',')[0].trim().slice(0, 40),
    caloriesPer100g: Math.min(caloriesPer100g, 1200),
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

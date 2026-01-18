const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NOW_REGION
);
const dataDir = isServerless
  ? path.join('/tmp', 'promonitor-data')
  : path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'store.db');
const uploadDir = isServerless
  ? path.join('/tmp', 'promonitor-uploads')
  : path.join(__dirname, 'public', 'uploads');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const db = new sqlite3.Database(dbFile);
const PROMONITOR_BASE_URL = 'https://promonitor.no';
const PROMONITOR_PRODUCTS_URL = `${PROMONITOR_BASE_URL}/products.json?limit=250`;
const PROMONITOR_FEATURED_URL = `${PROMONITOR_BASE_URL}/collections/frontpage/products.json?limit=50`;
const CUSTOM_PRODUCT_FILTER = "source IS NULL OR source = 'custom'";
const PUBLIC_PRODUCT_FILTER =
  "source IS NULL OR source IN ('custom', 'seed', 'promonitor')";
const PROMONITOR_COLLECTIONS_ENABLED = process.env.PROMONITOR_COLLECTIONS === '1';
const PROMONITOR_SEED_SLUGS = [
  'baerbar-skjerm-14',
  'baerbar-skjerm-16',
  'dobbelt-skjermsett',
  'trippel-skjermsett',
  'usb-c-dokkingstasjon',
  'hdmi-kabel-2-m',
  'magnetstativ',
  'baereetui'
];

const defaultSiteContent = {
  brand: 'ProMonitor',
  tagline:
    'B\u00e6rbare skjermer og skjermutvidelser som gir deg full arbeidsflate, uansett hvor du jobber.',
  hero: {
    eyebrow: 'Skjermutvidelse til laptop',
    title: 'Gj\u00f8r laptopen til en full arbeidsstasjon.',
    description:
      'Klikk p\u00e5 en ekstra skjerm og f\u00e5 mer plass til m\u00f8ter, analyser og kreativt arbeid. ProMonitor er laget for deg som jobber raskt og vil ha orden.',
    priceNote: 'Fra 4 490,-',
    image:
      'https://promonitor.no/cdn/shop/files/20251116_234349.jpg?v=1763333926&width=2000',
    meta: [
      'Fri frakt over 4 490,-',
      '30 dagers \u00e5pent kj\u00f8p',
      'Norsk kundeservice'
    ],
    primaryCta: {
      label: 'Se produktene',
      href: '/products'
    },
    secondaryCta: {
      label: 'Finn riktig oppsett',
      href: '#specs'
    }
  },
  home: {
    collections: {
      eyebrow: 'Oppsett',
      title: 'Velg oppsettet som passer arbeidsstilen din',
      subtitle:
        'Fra ett ekstra panel til full quad-oppsett - skreddersy arbeidsflaten din.'
    },
    featured: {
      eyebrow: 'Utvalgte produkter',
      title: 'Bestselgere fra ProMonitor',
      subtitle: 'Skjermer og tilbeh\u00f8r valgt for en mobil arbeidsflyt.'
    },
    flow: {
      eyebrow: 'Slik fungerer det',
      title: 'Slik f\u00e5r du mer arbeidsflate p\u00e5 minutter',
      subtitle: 'Fire enkle steg til ferdig oppsett.'
    },
    specs: {
      eyebrow: 'Spesifikasjoner',
      title: 'Bygget for fokus og flyt',
      subtitle: 'Mer plass, mindre friksjon - uansett hvor du jobber.',
      items: [
        {
          value: 'Opp til 3 skjermer',
          label: 'Skjermutvidelse',
          detail: 'Skaler fra ett ekstra panel til full quad-oppsett.'
        },
        {
          value: 'Plug-and-play',
          label: 'USB-C eller HDMI',
          detail: 'Koble til og jobb - uten drivere eller ekstra oppsett.'
        },
        {
          value: 'Klar for reise',
          label: 'Lett og slankt design',
          detail: 'Foldes flatt og f\u00e5r plass i vesken.'
        },
        {
          value: 'Mac + Windows',
          label: 'Universell kompatibilitet',
          detail: 'Fungerer med de fleste b\u00e6rbare PC-er og Mac.'
        }
      ]
    },
    benefits: {
      eyebrow: 'Fordeler',
      title: 'Trygg handel fra start til levering',
      subtitle:
        'Fri frakt, 30 dagers \u00e5pent kj\u00f8p og personlig support.'
    },
    cta: {
      eyebrow: 'Kundeservice',
      title: 'Trenger du hjelp til riktig skjermoppsett?',
      subtitle:
        'Vi svarer raskt og hjelper deg med kompatibilitet og montering.',
      primaryCta: {
        label: 'Se produkter',
        href: '/products'
      },
      secondaryCta: {
        label: 'Kontakt oss',
        href: '#support'
      }
    }
  },
  shop: {
    header: {
      eyebrow: 'Tilbud',
      title: 'Bygg arbeidsflaten du trenger',
      subtitle: 'Velg skjermutvidelser som gir deg ro, flyt og bedre oversikt.'
    },
    cta: {
      eyebrow: 'Rask hjelp',
      title: 'Usikker p\u00e5 hva som passer?',
      subtitle:
        'Vi hjelper deg \u00e5 velge riktig oppsett basert p\u00e5 laptop, behov og budsjett.',
      primaryCta: {
        label: 'Se kolleksjoner',
        href: '/collections'
      },
      secondaryCta: {
        label: 'Kontakt oss',
        href: '#support'
      }
    },
    collections: {
      eyebrow: 'Kolleksjoner',
      title: 'Finn riktig oppsett',
      subtitle: 'Velg mellom dobbelt-, trippel- og quad-oppsett.'
    },
    featured: {
      eyebrow: 'Utvalgte produkter',
      title: 'Bestselgere akkurat n\u00e5',
      subtitle:
        'Utvalgt for deg som jobber mobilt og vil ha orden p\u00e5 skjermene.'
    }
  },
  collectionsPage: {
    header: {
      eyebrow: 'Kolleksjoner',
      title: 'Skjermoppsett for ulike behov',
      subtitle: 'Velg oppsettet som gir deg riktig arbeidsflyt.'
    },
    cta: {
      eyebrow: 'Behov',
      title: 'Trenger du hjelp til valg?',
      subtitle:
        'Vi hjelper deg med kompatibilitet, montering og riktig skjermst\u00f8rrelse.',
      primaryCta: {
        label: 'G\u00e5 til tilbud',
        href: '/shop'
      },
      secondaryCta: {
        label: 'Kontakt oss',
        href: '#support'
      }
    }
  },
  collectionDetail: {
    cta: {
      eyebrow: 'Neste steg',
      title: 'Vil du se hele utvalget?',
      subtitle: 'Sammenlign alle modeller og finn riktig kombinasjon.',
      primaryCta: {
        label: 'Se alle produkter',
        href: '/products'
      },
      secondaryCta: {
        label: 'Tilbake til kolleksjoner',
        href: '/collections'
      }
    }
  },
  productsPage: {
    header: {
      eyebrow: 'Produkter',
      title: 'Hele sortimentet',
      subtitle:
        'Skjermutvidelser og tilbeh\u00f8r som gir mer arbeidsflate p\u00e5 sekunder.'
    }
  },
  productDetail: {
    eyebrow: 'ProMonitor',
    notice:
      'Fri frakt over 4 490,-, 30 dagers \u00e5pent kj\u00f8p og norsk kundeservice.'
  },
  timeline: [
    {
      title: 'Velg skjerm og feste',
      description:
        'Velg antall skjermer og feste som passer laptopen din.',
      detail:
        'Vi anbefaler riktig st\u00f8rrelse og kompatibilitet basert p\u00e5 behov.'
    },
    {
      title: 'Monter p\u00e5 sekunder',
      description:
        'Fest med magnet eller stativ og koble til via USB-C eller HDMI.',
      detail:
        'Ingen verkt\u00f8y - klikk p\u00e5 plass og start umiddelbart.'
    },
    {
      title: 'Optimaliser arbeidsflyten',
      description:
        'Flytt verkt\u00f8y, dokumenter og m\u00f8ter ut p\u00e5 ekstra skjermer.',
      detail:
        'Hold fokus p\u00e5 hovedoppgaven mens alt annet er synlig ved siden av.'
    },
    {
      title: 'Pakk sammen og dra videre',
      description:
        'Alt foldes flatt og er klart for neste arbeidssted.',
      detail:
        'Et kompakt oppsett som er lett \u00e5 ta med mellom hjem og kontor.'
    }
  ],
  benefits: [
    {
      title: 'Fri frakt',
      description: 'Rask levering fra norsk lager p\u00e5 utvalgte modeller.'
    },
    {
      title: '30 dagers \u00e5pent kj\u00f8p',
      description: 'Test skjermoppsettet hjemme og p\u00e5 kontoret.'
    },
    {
      title: '2 \u00e5rs garanti',
      description: 'Trygg handel med garanti p\u00e5 alle skjermer og tilbeh\u00f8r.'
    },
    {
      title: 'Personlig support',
      description: 'Vi hjelper deg med kompatibilitet og oppsett.'
    }
  ],
  collections: [
    {
      title: '1 ekstra skjerm - dobbeltoppsett',
      subtitle: 'Dobbeltoppsett',
      handle: 'dual-monitor',
      pitch: 'Et ekstra panel som dobler arbeidsflaten uten oppsettstress.',
      lead:
        'Perfekt for e-post, rapporter og m\u00f8ter side om side - stabilt og enkelt.'
    },
    {
      title: '2 ekstra skjermer - trippeloppsett',
      subtitle: 'Trippeloppsett',
      handle: 'triple-monitor',
      pitch: 'To ekstra skjermer for full oversikt og effektiv flyt.',
      lead:
        'Gi plass til analyser, design og prosjektstyring med maksimal oversikt.'
    },
    {
      title: '3 ekstra skjermer - quad-oppsett',
      subtitle: 'Quad-oppsett',
      handle: 'quad-monitor',
      pitch: 'Tre ekstra skjermer for maksimal kontroll og arbeidsro.',
      lead:
        'For deg som trenger stor arbeidsflate og vil slippe vinduskaos.'
    },
    {
      title: 'B\u00e6rbar skjerm',
      subtitle: 'B\u00e6rbare skjermer',
      handle: 'portable-monitorer',
      pitch: 'Ta med deg ekstra skjerm uansett hvor du jobber.',
      lead:
        'Lett, slank og klar for reise. Perfekt til hjemmekontor og kundem\u00f8ter.'
    }
  ]
};

let cachedSiteContent = null;

function mergeSiteContent(base, overrides) {
  if (!overrides || typeof overrides !== 'object') {
    return Array.isArray(base) ? [...base] : { ...base };
  }

  if (Array.isArray(base)) {
    return Array.isArray(overrides) ? [...overrides] : [...base];
  }

  const result = { ...base };
  Object.keys(overrides).forEach((key) => {
    const overrideValue = overrides[key];
    if (overrideValue === undefined) return;
    const baseValue = base[key];
    if (Array.isArray(overrideValue)) {
      result[key] = [...overrideValue];
    } else if (
      overrideValue &&
      typeof overrideValue === 'object' &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      result[key] = mergeSiteContent(baseValue, overrideValue);
    } else {
      result[key] = overrideValue;
    }
  });
  return result;
}

function normalizeSiteContent(content) {
  return mergeSiteContent(defaultSiteContent, content || {});
}

function sanitizeSiteContent(content) {
  const normalized = normalizeSiteContent(content);
  normalized.home = normalized.home || {};
  normalized.home.specs = normalized.home.specs || {};
  normalized.home.specs.items = Array.isArray(normalized.home.specs.items)
    ? normalized.home.specs.items
    : [];
  normalized.hero = normalized.hero || {};
  normalized.hero.meta = Array.isArray(normalized.hero.meta)
    ? normalized.hero.meta
    : [];
  normalized.timeline = Array.isArray(normalized.timeline)
    ? normalized.timeline
    : [];
  normalized.benefits = Array.isArray(normalized.benefits)
    ? normalized.benefits
    : [];
  normalized.collections = Array.isArray(normalized.collections)
    ? normalized.collections
    : [];
  return normalized;
}

async function ensureSiteContent() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS site_content (
      id INTEGER PRIMARY KEY,
      content_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const row = await dbGet('SELECT content_json FROM site_content WHERE id = 1');
  if (!row) {
    const timestamp = new Date().toISOString();
    const contentJson = JSON.stringify(defaultSiteContent);
    await dbRun(
      'INSERT INTO site_content (id, content_json, updated_at) VALUES (1, ?, ?)',
      [contentJson, timestamp]
    );
    cachedSiteContent = sanitizeSiteContent(defaultSiteContent);
  }
}

async function migrateSiteContent() {
  const content = await getSiteContent();
  let updated = false;

  if (content.shop?.header?.eyebrow === 'Butikk') {
    content.shop.header.eyebrow = 'Tilbud';
    updated = true;
  }

  if (content.productsPage?.header?.eyebrow === 'Butikk') {
    content.productsPage.header.eyebrow = 'Produkter';
    updated = true;
  }

  if (content.collectionsPage?.cta?.primaryCta?.label === 'G\u00e5 til butikk') {
    content.collectionsPage.cta.primaryCta.label = 'G\u00e5 til tilbud';
    updated = true;
  }

  if (updated) {
    await saveSiteContent(content);
  }
}

async function getSiteContent() {
  if (cachedSiteContent) return cachedSiteContent;
  const row = await dbGet('SELECT content_json FROM site_content WHERE id = 1');
  if (!row) {
    cachedSiteContent = sanitizeSiteContent(defaultSiteContent);
    return cachedSiteContent;
  }
  try {
    const parsed = JSON.parse(row.content_json);
    cachedSiteContent = sanitizeSiteContent(parsed);
  } catch (error) {
    console.error('Failed to parse site content JSON', error);
    cachedSiteContent = sanitizeSiteContent(defaultSiteContent);
  }
  return cachedSiteContent;
}

async function saveSiteContent(content) {
  const normalized = sanitizeSiteContent(content);
  const timestamp = new Date().toISOString();
  const contentJson = JSON.stringify(normalized);
  await dbRun(
    'INSERT OR REPLACE INTO site_content (id, content_json, updated_at) VALUES (1, ?, ?)',
    [contentJson, timestamp]
  );
  cachedSiteContent = normalized;
  return normalized;
}

function getCollectionByHandle(content, handle) {
  if (!content || !Array.isArray(content.collections)) return null;
  return content.collections.find((collection) => collection.handle === handle);
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function decodeHtmlEntities(value) {
  if (!value) return '';
  const entityMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  return value.replace(/&[#a-z0-9]+;/gi, (entity) => {
    if (entityMap[entity]) return entityMap[entity];
    const numericMatch = entity.match(/&#(x?[0-9a-f]+);/i);
    if (numericMatch) {
      const raw = numericMatch[1];
      const codePoint = raw.startsWith('x')
        ? parseInt(raw.slice(1), 16)
        : parseInt(raw, 10);
      if (!Number.isNaN(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
    }
    return entity;
  });
}

function stripHtml(value) {
  if (!value) return '';
  const stripped = value.replace(/<[^>]*>/g, ' ');
  return decodeHtmlEntities(stripped).replace(/\s+/g, ' ').trim();
}

function toAbsoluteUrl(url) {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${PROMONITOR_BASE_URL}${url}`;
  return url;
}

async function ensureColumn(table, column, type) {
  const columns = await dbAll(`PRAGMA table_info(${table})`);
  if (columns.some((col) => col.name === column)) return;
  await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

async function ensureProductColumns() {
  await ensureColumn('products', 'source', 'TEXT');
  await ensureColumn('products', 'external_id', 'INTEGER');
  await ensureColumn('products', 'sort_order', 'INTEGER');
  await ensureProductOrder();
}

async function ensureProductImageTable() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);
}

async function ensureProductOrder() {
  const rows = await dbAll(
    'SELECT id FROM products WHERE sort_order IS NULL ORDER BY created_at ASC'
  );
  if (rows.length === 0) return;
  const maxRow = await dbGet('SELECT MAX(sort_order) as max FROM products');
  let nextOrder = Number(maxRow?.max) || 0;
  for (const row of rows) {
    nextOrder += 1;
    await dbRun('UPDATE products SET sort_order = ? WHERE id = ?', [
      nextOrder,
      row.id
    ]);
  }
}

async function getMaxSortOrder() {
  const row = await dbGet('SELECT MAX(sort_order) as max FROM products');
  return Number(row?.max) || 0;
}

async function getMaxImageOrder(productId) {
  const row = await dbGet(
    'SELECT MAX(sort_order) as max FROM product_images WHERE product_id = ?',
    [productId]
  );
  return Number(row?.max) || 0;
}

async function getProductImages(productId) {
  return dbAll(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
    [productId]
  );
}

async function addProductImages(productId, imagePaths) {
  if (!imagePaths || imagePaths.length === 0) return;
  let nextOrder = await getMaxImageOrder(productId);
  const timestamp = new Date().toISOString();
  for (const imagePath of imagePaths) {
    nextOrder += 1;
    await dbRun(
      `INSERT INTO product_images (product_id, image_path, sort_order, created_at)
       VALUES (?, ?, ?, ?)`,
      [productId, imagePath, nextOrder, timestamp]
    );
  }
}

async function markSeedProducts() {
  if (PROMONITOR_SEED_SLUGS.length === 0) return;
  const placeholders = PROMONITOR_SEED_SLUGS.map(() => '?').join(',');
  await dbRun(
    `UPDATE products SET source = 'seed' WHERE source IS NULL AND slug IN (${placeholders})`,
    PROMONITOR_SEED_SLUGS
  );
}

async function fetchPromonitorCollectionProducts(handle) {
  if (!PROMONITOR_COLLECTIONS_ENABLED) {
    return { ok: false, products: [], disabled: true };
  }
  if (typeof fetch !== 'function') {
    return { ok: false, products: [] };
  }

  try {
    const url = `${PROMONITOR_BASE_URL}/collections/${handle}/products.json?limit=250`;
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, products: [] };
    }
    const payload = await response.json();
    const products = (payload.products || []).map((product) => {
      const imageSrc =
        (product.images && product.images[0] && product.images[0].src) ||
        product.image?.src ||
        '/images/monitor-placeholder.svg';
      const price = product.variants && product.variants[0]?.price;
      return {
        id: product.id,
        name: product.title,
        slug: product.handle,
        price_cents: parsePriceToCents(price) ?? 0,
        image_path: toAbsoluteUrl(imageSrc)
      };
    });
    return { ok: true, products };
  } catch (error) {
    console.error('Promonitor collection fetch failed', error);
    return { ok: false, products: [] };
  }
}

async function syncPromonitorProducts() {
  const result = { ok: false, count: 0 };
  try {
    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is not available in this Node version.');
    }
    const [productsResponse, featuredResponse] = await Promise.all([
      fetch(PROMONITOR_PRODUCTS_URL),
      fetch(PROMONITOR_FEATURED_URL)
    ]);

    if (!productsResponse.ok) {
      throw new Error(`Promonitor products fetch failed: ${productsResponse.status}`);
    }

    const productsPayload = await productsResponse.json();
    const featuredPayload = featuredResponse.ok
      ? await featuredResponse.json()
      : { products: [] };

    const featuredHandles = new Set(
      (featuredPayload.products || []).map((product) => product.handle)
    );

    const products = productsPayload.products || [];
    let nextSortOrder = await getMaxSortOrder();
    const externalIds = [];
    for (const product of products) {
      const description = stripHtml(product.body_html);
      const imageSrc =
        (product.images && product.images[0] && product.images[0].src) ||
        product.image?.src ||
        '/images/mission-patch.svg';
      const price = product.variants && product.variants[0]?.price;
      const price_cents = parsePriceToCents(price) ?? 0;
      const createdAt = product.created_at || new Date().toISOString();
      const updatedAt = product.updated_at || new Date().toISOString();
      const slug = product.handle;
      const existing = await dbGet(
        'SELECT id FROM products WHERE external_id = ? OR slug = ?',
        [product.id, slug]
      );

      externalIds.push(product.id);
      if (existing) {
        await dbRun(
          `UPDATE products
           SET name = ?, slug = ?, description = ?, price_cents = ?, image_path = ?,
               is_featured = ?, updated_at = ?, source = 'promonitor', external_id = ?
           WHERE id = ?`,
          [
            product.title,
            slug,
            description || product.title,
            price_cents,
            toAbsoluteUrl(imageSrc),
            featuredHandles.has(product.handle) ? 1 : 0,
            updatedAt,
            product.id,
            existing.id
          ]
        );
      } else {
        nextSortOrder += 1;
        await dbRun(
          `INSERT INTO products
            (name, slug, description, price_cents, image_path, is_featured, created_at, updated_at, source, external_id, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'promonitor', ?, ?)`,
          [
            product.title,
            slug,
            description || product.title,
            price_cents,
            toAbsoluteUrl(imageSrc),
            featuredHandles.has(product.handle) ? 1 : 0,
            createdAt,
            updatedAt,
            product.id,
            nextSortOrder
          ]
        );
      }
    }

    if (externalIds.length > 0) {
      const placeholders = externalIds.map(() => '?').join(',');
      await dbRun(
        `DELETE FROM products
         WHERE source = 'promonitor' AND external_id NOT IN (${placeholders})`,
        externalIds
      );
    }

    await dbRun(`DELETE FROM products WHERE source = 'seed'`);

    result.ok = true;
    result.count = products.length;
    return result;
  } catch (error) {
    console.error('Promonitor sync failed', error);
    return result;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\u00e6/g, 'ae')
    .replace(/\u00f8/g, 'o')
    .replace(/\u00e5/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function generateUniqueSlug(name, productId) {
  const base = slugify(name) || 'item';
  let slug = base;
  let counter = 1;
  while (true) {
    const row = await dbGet(
      'SELECT id FROM products WHERE slug = ? AND id != ?',
      [slug, productId || 0]
    );
    if (!row) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
}

function parsePriceToCents(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value)
    .replace(/[^0-9,\.]/g, '')
    .replace(',', '.');
  const numberValue = Number.parseFloat(normalized);
  if (Number.isNaN(numberValue)) return null;
  return Math.round(numberValue * 100);
}

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

const moneyFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK'
});

function formatMoney(cents) {
  return moneyFormatter.format((cents || 0) / 100);
}

function getCart(sessionData) {
  if (!sessionData.cart) {
    sessionData.cart = { items: {} };
  }
  return sessionData.cart;
}

function getCartItems(cart) {
  return Object.values(cart.items || {});
}

function getCartCount(cart) {
  return getCartItems(cart).reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotals(cart) {
  const items = getCartItems(cart);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price_cents * item.qty,
    0
  );
  return { subtotal, total: subtotal };
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/image\/(png|jpeg|jpg|webp|svg\+xml)/.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Kun bildefiler er tillatt.'));
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'spacex-store-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

const dbReady = initDb();

app.use(async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (error) {
    next(error);
  }
});

app.use(async (req, res, next) => {
  const cart = getCart(req.session);
  res.locals.cartCount = getCartCount(cart);
  res.locals.adminUser = req.session.adminUser;
  res.locals.formatMoney = formatMoney;
  res.locals.bodyClass = '';
  try {
    const content = await getSiteContent();
    req.siteContent = content;
    res.locals.siteContent = content;
    res.locals.siteName = content.brand;
    res.locals.siteTagline = content.tagline;
    next();
  } catch (error) {
    next(error);
  }
});

function requireAdmin(req, res, next) {
  if (req.session.adminUser) return next();
  return res.redirect('/admin/login');
}

async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      image_path TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0,
      source TEXT,
      external_id INTEGER,
      sort_order INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await ensureProductImageTable();

  await dbRun(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      line_total_cents INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    )
  `);

  const defaultAdminEmail = 's.arntsen@yahoo.com';
  const defaultAdminPassword = 'mjjaty4p';
  const existingAdmin = await dbGet(
    'SELECT id FROM admin_users WHERE email = ?',
    [defaultAdminEmail]
  );
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(defaultAdminPassword, 10);
    await dbRun(
      'INSERT INTO admin_users (email, password_hash, created_at) VALUES (?, ?, ?)',
      [defaultAdminEmail, passwordHash, new Date().toISOString()]
    );
  }

  await ensureProductColumns();
  await ensureSiteContent();
  await migrateSiteContent();
  await markSeedProducts();

  const existingProducts = await dbGet(
    'SELECT COUNT(*) as count FROM products'
  );
  const shouldSync = process.env.PROMONITOR_SYNC === '1';

  let synced = false;
  if (shouldSync) {
    const syncResult = await syncPromonitorProducts();
    synced = syncResult.ok;
  }

  const shouldSeed = process.env.SEED_PRODUCTS === '1';
  if (!synced && existingProducts.count === 0 && shouldSeed) {
    let nextSortOrder = await getMaxSortOrder();
    const seedProducts = [
      {
        name: 'B\u00e6rbar skjerm 14\"',
        description:
          'Ekstra skjerm som pakkes flatt og kobles til med USB-C.',
        price_cents: 299900,
        image_path: '/images/monitor-placeholder.svg',
        is_featured: 1
      },
      {
        name: 'B\u00e6rbar skjerm 16\"',
        description:
          'Stor arbeidsflate for kreative oppgaver og multitasking.',
        price_cents: 349900,
        image_path: '/images/monitor-placeholder.svg',
        is_featured: 1
      },
      {
        name: 'Dobbelt skjermsett',
        description:
          'To skjermer som festes rundt laptopen for ekstra arbeidsflate.',
        price_cents: 449000,
        image_path: '/images/monitor-placeholder.svg',
        is_featured: 1
      },
      {
        name: 'Trippel skjermsett',
        description:
          'Jobb p\u00e5 tre skjermer samtidig med fleksibel montering.',
        price_cents: 499000,
        image_path: '/images/monitor-placeholder.svg',
        is_featured: 0
      },
      {
        name: 'USB-C dokkingstasjon',
        description:
          'Koble til skjerm, nettverk og lading med en dokkingstasjon.',
        price_cents: 129900,
        image_path: '/images/monitor-placeholder.svg',
        is_featured: 0
      },
      {
        name: 'HDMI-kabel 2 m',
        description:
          'Solid kabel til ekstra skjermer og docking.',
        price_cents: 24900,
        image_path: '/images/monitor-placeholder.svg',
        is_featured: 0
      },
      {
        name: 'Magnetstativ',
        description:
          'Stabilt stativ for b\u00e6rbare skjermer og oppsett p\u00e5 farten.',
        price_cents: 59900,
        image_path: '/images/monitor-placeholder.svg',
        is_featured: 0
      },
      {
        name: 'B\u00e6reetui',
        description:
          'Beskyttende etui for sikker transport av skjerm.',
        price_cents: 39900,
        image_path: '/images/monitor-placeholder.svg',
        is_featured: 0
      }
    ];

    for (const product of seedProducts) {
      const slug = await generateUniqueSlug(product.name);
      const timestamp = new Date().toISOString();
      nextSortOrder += 1;
      await dbRun(
        `INSERT INTO products
          (name, slug, description, price_cents, image_path, is_featured, created_at, updated_at, source, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seed', ?)`,
        [
          product.name,
          slug,
          product.description,
          product.price_cents,
          product.image_path,
          product.is_featured,
          timestamp,
          timestamp,
          nextSortOrder
        ]
      );
    }
  }
}

app.get('/', async (req, res) => {
  const content = req.siteContent || (await getSiteContent());
  res.render('index', {
    title: content.brand || 'ProMonitor',
    content,
    pageScript: 'main'
  });
});

app.get('/shop', async (req, res) => {
  const content = req.siteContent || (await getSiteContent());
  const offers = await dbAll(
    `SELECT * FROM products WHERE (${CUSTOM_PRODUCT_FILTER}) AND is_featured = 1
     ORDER BY sort_order ASC, updated_at DESC`
  );
  res.render('shop', {
    title: 'Tilbud',
    offers,
    content,
    pageScript: 'main'
  });
});

app.get('/products', async (req, res) => {
  const content = req.siteContent || (await getSiteContent());
  const products = await dbAll(
    `SELECT * FROM products WHERE (${PUBLIC_PRODUCT_FILTER})
     ORDER BY sort_order ASC, updated_at DESC`
  );
  res.render('products', {
    title: 'Produkter',
    products,
    content,
    pageScript: 'main'
  });
});

app.get('/collections', async (req, res) => {
  const content = req.siteContent || (await getSiteContent());
  res.render('collections', {
    title: 'Kolleksjoner',
    content,
    pageScript: 'main'
  });
});

app.get('/collections/:handle', async (req, res) => {
  const content = req.siteContent || (await getSiteContent());
  const handle = req.params.handle;
  const collection = getCollectionByHandle(content, handle);
  const title = collection ? collection.title : 'Kolleksjon';
  const subtitle = collection ? collection.subtitle : 'Skjermutvidelse';
  const lead = collection
    ? collection.lead
    : 'Utvalgte produkter fra ProMonitor.';

  const collectionResult = await fetchPromonitorCollectionProducts(handle);
  let products = collectionResult.products;
  let errorMessage = null;

  if (!collectionResult.ok) {
    if (!collectionResult.disabled) {
      errorMessage =
        'Vi klarte ikke \u00e5 hente denne kolleksjonen akkurat n\u00e5. Vi viser alle produkter.';
    }
    products = await dbAll(
      `SELECT * FROM products WHERE (${PUBLIC_PRODUCT_FILTER})
       ORDER BY sort_order ASC, updated_at DESC`
    );
  }

  res.render('collection-detail', {
    title,
    collection: {
      title,
      subtitle,
      lead
    },
    products,
    errorMessage,
    content,
    pageScript: 'main'
  });
});

app.get('/products/:slug', async (req, res) => {
  const content = req.siteContent || (await getSiteContent());
  const product = await dbGet(
    `SELECT * FROM products WHERE slug = ? AND (${PUBLIC_PRODUCT_FILTER})`,
    [req.params.slug]
  );
  if (!product) return res.status(404).send('Produktet finnes ikke.');
  const extraImages = await getProductImages(product.id);
  const galleryImages = [product.image_path]
    .concat(extraImages.map((image) => image.image_path))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
  res.render('product', {
    title: product.name,
    product,
    productImages: galleryImages,
    content,
    pageScript: 'main'
  });
});

app.post('/cart/add', async (req, res) => {
  const productId = Number.parseInt(req.body.product_id, 10);
  const qty = Math.max(Number.parseInt(req.body.qty || '1', 10), 1);
  const product = await dbGet(
    `SELECT * FROM products WHERE id = ? AND (${PUBLIC_PRODUCT_FILTER})`,
    [productId]
  );
  if (!product) return res.status(404).send('Produktet finnes ikke.');

  const cart = getCart(req.session);
  const existing = cart.items[product.id];
  if (existing) {
    existing.qty += qty;
  } else {
    cart.items[product.id] = {
      id: product.id,
      name: product.name,
      price_cents: product.price_cents,
      image_path: product.image_path,
      qty
    };
  }

  res.redirect('/cart');
});

app.get('/cart', (req, res) => {
  const cart = getCart(req.session);
  const items = getCartItems(cart);
  const totals = getCartTotals(cart);
  res.render('cart', {
    title: 'Handlekurv',
    items,
    totals,
    pageScript: 'main'
  });
});

app.post('/cart/update', (req, res) => {
  const cart = getCart(req.session);
  Object.keys(cart.items).forEach((id) => {
    const qty = Number.parseInt(req.body[`qty_${id}`], 10);
    if (!qty || qty <= 0) {
      delete cart.items[id];
    } else {
      cart.items[id].qty = qty;
    }
  });
  res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
  const cart = getCart(req.session);
  const productId = req.body.product_id;
  delete cart.items[productId];
  res.redirect('/cart');
});

app.get('/checkout', (req, res) => {
  const cart = getCart(req.session);
  const items = getCartItems(cart);
  if (items.length === 0) return res.redirect('/cart');
  const totals = getCartTotals(cart);
  res.render('checkout', {
    title: 'Kasse',
    items,
    totals,
    pageScript: 'main'
  });
});

app.post('/checkout', async (req, res) => {
  const cart = getCart(req.session);
  const items = getCartItems(cart);
  if (items.length === 0) return res.redirect('/cart');

  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const address = (req.body.address || '').trim();
  if (!name || !email || !address) {
    const totals = getCartTotals(cart);
    return res.render('checkout', {
      title: 'Kasse',
      items,
      totals,
      error: 'Fyll inn alle feltene i kassen.',
      pageScript: 'main'
    });
  }

  const totals = getCartTotals(cart);
  const orderResult = await dbRun(
    'INSERT INTO orders (name, email, address, total_cents, created_at) VALUES (?, ?, ?, ?, ?)',
    [name, email, address, totals.total, new Date().toISOString()]
  );

  const orderId = orderResult.lastID;
  for (const item of items) {
    await dbRun(
      'INSERT INTO order_items (order_id, product_id, name, price_cents, qty, line_total_cents) VALUES (?, ?, ?, ?, ?, ?)',
      [
        orderId,
        item.id,
        item.name,
        item.price_cents,
        item.qty,
        item.price_cents * item.qty
      ]
    );
  }

  req.session.cart = { items: {} };
  res.redirect(`/order/${orderId}/confirmation`);
});

app.get('/order/:id/confirmation', async (req, res) => {
  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [
    req.params.id
  ]);
  if (!order) return res.status(404).send('Ordren finnes ikke.');
  const items = await dbAll(
    'SELECT * FROM order_items WHERE order_id = ?',
    [req.params.id]
  );
  res.render('order-confirmation', {
    title: 'Ordrebekreftelse',
    order,
    items,
    pageScript: 'main'
  });
});

app.get('/admin/login', (req, res) => {
  res.render('admin/login', {
    title: 'Admin innlogging',
    pageScript: 'admin',
    bodyClass: 'admin-layout'
  });
});

app.post('/admin/login', async (req, res) => {
  const email = (req.body.email || '').trim();
  const password = req.body.password || '';
  const user = await dbGet('SELECT * FROM admin_users WHERE email = ?', [
    email
  ]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('admin/login', {
      title: 'Admin innlogging',
      error: 'Ugyldig innlogging. Sjekk e-post og passord.',
      pageScript: 'admin',
      bodyClass: 'admin-layout'
    });
  }
  req.session.adminUser = { id: user.id, email: user.email };
  res.redirect('/admin');
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/admin', requireAdmin, async (req, res) => {
  const productCount = await dbGet('SELECT COUNT(*) as count FROM products');
  const orderCount = await dbGet('SELECT COUNT(*) as count FROM orders');
  const revenue = await dbGet('SELECT SUM(total_cents) as total FROM orders');
  res.render('admin/dashboard', {
    title: 'Administrasjon',
    stats: {
      productCount: productCount.count,
      orderCount: orderCount.count,
      revenue: revenue.total || 0
    },
    pageScript: 'admin',
    bodyClass: 'admin-layout'
  });
});

app.get('/admin/content', requireAdmin, async (req, res) => {
  const content = await getSiteContent();
  res.render('admin/site-content', {
    title: 'Rediger innhold',
    content,
    saved: req.query.saved === '1',
    pageScript: 'admin',
    bodyClass: 'admin-layout'
  });
});

app.post(
  '/admin/content',
  requireAdmin,
  upload.fields([{ name: 'hero_image', maxCount: 1 }]),
  async (req, res) => {
    const existing = await getSiteContent();
    const safe = (value) => (value || '').trim();

    const heroImageUpload =
      req.files && req.files.hero_image ? req.files.hero_image[0] : null;
    const heroImageUrl = safe(req.body.hero_image_url);
    const heroImage = heroImageUpload
      ? `/uploads/${heroImageUpload.filename}`
      : heroImageUrl || existing.hero.image;

    const heroMeta = toArray(req.body.hero_meta)
      .map((item) => safe(item))
      .filter(Boolean);

    const timelineTitles = toArray(req.body.timeline_title).map((item) =>
      safe(item)
    );
    const timelineDescriptions = toArray(
      req.body.timeline_description
    ).map((item) => safe(item));
    const timelineDetails = toArray(req.body.timeline_detail).map((item) =>
      safe(item)
    );
    const timeline = timelineTitles
      .map((title, index) => {
        const description = timelineDescriptions[index] || '';
        const detail = timelineDetails[index] || '';
        if (!title && !description && !detail) return null;
        if (!title || !description) return null;
        return { title, description, detail };
      })
      .filter(Boolean);

    const benefitTitles = toArray(req.body.benefit_title).map((item) =>
      safe(item)
    );
    const benefitDescriptions = toArray(req.body.benefit_description).map(
      (item) => safe(item)
    );
    const benefits = benefitTitles
      .map((title, index) => {
        const description = benefitDescriptions[index] || '';
        if (!title && !description) return null;
        if (!title || !description) return null;
        return { title, description };
      })
      .filter(Boolean);

    const specValues = toArray(req.body.spec_value).map((item) =>
      safe(item)
    );
    const specLabels = toArray(req.body.spec_label).map((item) =>
      safe(item)
    );
    const specDetails = toArray(req.body.spec_detail).map((item) =>
      safe(item)
    );
    const specsItems = specValues
      .map((value, index) => {
        const label = specLabels[index] || '';
        const detail = specDetails[index] || '';
        if (!value && !label && !detail) return null;
        if (!value || !label) return null;
        return { value, label, detail };
      })
      .filter(Boolean);

    const collectionTitles = toArray(req.body.collection_title).map((item) =>
      safe(item)
    );
    const collectionSubtitles = toArray(req.body.collection_subtitle).map(
      (item) => safe(item)
    );
    const collectionHandles = toArray(req.body.collection_handle).map((item) =>
      safe(item)
    );
    const collectionPitches = toArray(req.body.collection_pitch).map((item) =>
      safe(item)
    );
    const collectionLeads = toArray(req.body.collection_lead).map((item) =>
      safe(item)
    );
    const collections = collectionTitles
      .map((title, index) => {
        const subtitle = collectionSubtitles[index] || '';
        const pitch = collectionPitches[index] || '';
        const lead = collectionLeads[index] || '';
        const handle =
          collectionHandles[index] || (title ? slugify(title) : '');
        if (!title && !subtitle && !pitch && !lead && !handle) return null;
        if (!handle) return null;
        return { title, subtitle, handle, pitch, lead };
      })
      .filter(Boolean);

    const updated = {
      ...existing,
      brand: safe(req.body.brand),
      tagline: safe(req.body.tagline),
      hero: {
        ...existing.hero,
        eyebrow: safe(req.body.hero_eyebrow),
        title: safe(req.body.hero_title),
        description: safe(req.body.hero_description),
        image: heroImage,
        meta: heroMeta,
        primaryCta: {
          ...existing.hero.primaryCta,
          label: safe(req.body.hero_primary_label),
          href: safe(req.body.hero_primary_href)
        },
        secondaryCta: {
          ...existing.hero.secondaryCta,
          label: safe(req.body.hero_secondary_label),
          href: safe(req.body.hero_secondary_href)
        }
      },
      home: {
        ...existing.home,
        collections: {
          ...existing.home.collections,
          eyebrow: safe(req.body.home_collections_eyebrow),
          title: safe(req.body.home_collections_title),
          subtitle: safe(req.body.home_collections_subtitle)
        },
        featured: {
          ...existing.home.featured,
          eyebrow: safe(req.body.home_featured_eyebrow),
          title: safe(req.body.home_featured_title),
          subtitle: safe(req.body.home_featured_subtitle)
        },
        flow: {
          ...existing.home.flow,
          eyebrow: safe(req.body.home_flow_eyebrow),
          title: safe(req.body.home_flow_title),
          subtitle: safe(req.body.home_flow_subtitle)
        },
        benefits: {
          ...existing.home.benefits,
          eyebrow: safe(req.body.home_benefits_eyebrow),
          title: safe(req.body.home_benefits_title),
          subtitle: safe(req.body.home_benefits_subtitle)
        },
        specs: {
          ...existing.home.specs,
          eyebrow: safe(req.body.home_specs_eyebrow),
          title: safe(req.body.home_specs_title),
          subtitle: safe(req.body.home_specs_subtitle),
          items: specsItems
        },
        cta: {
          ...existing.home.cta,
          eyebrow: safe(req.body.home_cta_eyebrow),
          title: safe(req.body.home_cta_title),
          subtitle: safe(req.body.home_cta_subtitle),
          primaryCta: {
            ...existing.home.cta.primaryCta,
            label: safe(req.body.home_cta_primary_label),
            href: safe(req.body.home_cta_primary_href)
          },
          secondaryCta: {
            ...existing.home.cta.secondaryCta,
            label: safe(req.body.home_cta_secondary_label),
            href: safe(req.body.home_cta_secondary_href)
          }
        }
      },
      shop: {
        ...existing.shop,
        header: {
          ...existing.shop.header,
          eyebrow: safe(req.body.shop_header_eyebrow),
          title: safe(req.body.shop_header_title),
          subtitle: safe(req.body.shop_header_subtitle)
        },
        cta: {
          ...existing.shop.cta,
          eyebrow: safe(req.body.shop_cta_eyebrow),
          title: safe(req.body.shop_cta_title),
          subtitle: safe(req.body.shop_cta_subtitle),
          primaryCta: {
            ...existing.shop.cta.primaryCta,
            label: safe(req.body.shop_cta_primary_label),
            href: safe(req.body.shop_cta_primary_href)
          },
          secondaryCta: {
            ...existing.shop.cta.secondaryCta,
            label: safe(req.body.shop_cta_secondary_label),
            href: safe(req.body.shop_cta_secondary_href)
          }
        },
        collections: {
          ...existing.shop.collections,
          eyebrow: safe(req.body.shop_collections_eyebrow),
          title: safe(req.body.shop_collections_title),
          subtitle: safe(req.body.shop_collections_subtitle)
        },
        featured: {
          ...existing.shop.featured,
          eyebrow: safe(req.body.shop_featured_eyebrow),
          title: safe(req.body.shop_featured_title),
          subtitle: safe(req.body.shop_featured_subtitle)
        }
      },
      collectionsPage: {
        ...existing.collectionsPage,
        header: {
          ...existing.collectionsPage.header,
          eyebrow: safe(req.body.collections_header_eyebrow),
          title: safe(req.body.collections_header_title),
          subtitle: safe(req.body.collections_header_subtitle)
        },
        cta: {
          ...existing.collectionsPage.cta,
          eyebrow: safe(req.body.collections_cta_eyebrow),
          title: safe(req.body.collections_cta_title),
          subtitle: safe(req.body.collections_cta_subtitle),
          primaryCta: {
            ...existing.collectionsPage.cta.primaryCta,
            label: safe(req.body.collections_cta_primary_label),
            href: safe(req.body.collections_cta_primary_href)
          },
          secondaryCta: {
            ...existing.collectionsPage.cta.secondaryCta,
            label: safe(req.body.collections_cta_secondary_label),
            href: safe(req.body.collections_cta_secondary_href)
          }
        }
      },
      collectionDetail: {
        ...existing.collectionDetail,
        cta: {
          ...existing.collectionDetail.cta,
          eyebrow: safe(req.body.collection_detail_cta_eyebrow),
          title: safe(req.body.collection_detail_cta_title),
          subtitle: safe(req.body.collection_detail_cta_subtitle),
          primaryCta: {
            ...existing.collectionDetail.cta.primaryCta,
            label: safe(req.body.collection_detail_cta_primary_label),
            href: safe(req.body.collection_detail_cta_primary_href)
          },
          secondaryCta: {
            ...existing.collectionDetail.cta.secondaryCta,
            label: safe(req.body.collection_detail_cta_secondary_label),
            href: safe(req.body.collection_detail_cta_secondary_href)
          }
        }
      },
      productsPage: {
        ...existing.productsPage,
        header: {
          ...existing.productsPage.header,
          eyebrow: safe(req.body.products_header_eyebrow),
          title: safe(req.body.products_header_title),
          subtitle: safe(req.body.products_header_subtitle)
        }
      },
      productDetail: {
        ...existing.productDetail,
        eyebrow: safe(req.body.product_detail_eyebrow),
        notice: safe(req.body.product_detail_notice)
      },
      timeline,
      benefits,
      collections
    };

    try {
      await saveSiteContent(updated);
      res.redirect('/admin/content?saved=1');
    } catch (error) {
      console.error('Failed to save site content', error);
      res.render('admin/site-content', {
        title: 'Rediger innhold',
        content: updated,
        error: 'Kunne ikke lagre innholdet. Pr\u00f8v igjen.',
        pageScript: 'admin',
        bodyClass: 'admin-layout'
      });
    }
  }
);

app.get('/admin/products', requireAdmin, async (req, res) => {
  const products = await dbAll(
    `SELECT * FROM products WHERE (${CUSTOM_PRODUCT_FILTER})
     ORDER BY sort_order ASC, updated_at DESC`
  );
  res.render('admin/products', {
    title: 'Produkter',
    products,
    pageScript: 'admin',
    bodyClass: 'admin-layout'
  });
});

app.post('/admin/products/reorder', requireAdmin, async (req, res) => {
  const rawOrder = (req.body.order || '').split(',');
  const order = rawOrder
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));

  if (order.length === 0) {
    return res.redirect('/admin/products');
  }

  try {
    await dbRun('BEGIN TRANSACTION');
    for (let index = 0; index < order.length; index += 1) {
      await dbRun('UPDATE products SET sort_order = ? WHERE id = ?', [
        index + 1,
        order[index]
      ]);
    }
    await dbRun('COMMIT');
  } catch (error) {
    await dbRun('ROLLBACK');
    console.error('Failed to reorder products', error);
  }

  return res.redirect('/admin/products');
});

app.get('/admin/products/new', requireAdmin, (req, res) => {
  res.render('admin/product-form', {
    title: 'Nytt produkt',
    product: null,
    productImages: [],
    pageScript: 'admin',
    bodyClass: 'admin-layout'
  });
});

app.post('/admin/products', requireAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery_images', maxCount: 12 }
]), async (req, res) => {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();
  const price_cents = parsePriceToCents(req.body.price);
  const is_featured = req.body.is_featured ? 1 : 0;
  const image_url = (req.body.image_url || '').trim();
  const imageFile = req.files && req.files.image ? req.files.image[0] : null;
  const galleryFiles = req.files && req.files.gallery_images
    ? req.files.gallery_images
    : [];
  const galleryPaths = galleryFiles.map((file) => `/uploads/${file.filename}`);
  let image_path = imageFile ? `/uploads/${imageFile.filename}` : image_url;
  if (!image_path && galleryPaths.length > 0) {
    image_path = galleryPaths.shift();
  }
  if (!image_path) {
    image_path = '/images/monitor-placeholder.svg';
  }

  if (!name || !description || price_cents === null) {
    return res.render('admin/product-form', {
      title: 'Nytt produkt',
      product: {
        name,
        description,
        price_cents: price_cents || 0,
        image_path,
        is_featured
      },
      productImages: galleryPaths,
      error: 'Fyll inn produktnavn, beskrivelse og pris.',
      pageScript: 'admin',
      bodyClass: 'admin-layout'
    });
  }

  const slug = await generateUniqueSlug(name);
  const timestamp = new Date().toISOString();
  const sortOrder = (await getMaxSortOrder()) + 1;
  const insertResult = await dbRun(
    `INSERT INTO products
      (name, slug, description, price_cents, image_path, is_featured, created_at, updated_at, source, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?)`,
    [
      name,
      slug,
      description,
      price_cents,
      image_path,
      is_featured,
      timestamp,
      timestamp,
      sortOrder
    ]
  );

  if (galleryPaths.length > 0) {
    await addProductImages(insertResult.lastID, galleryPaths);
  }

  res.redirect('/admin/products');
});

app.get('/admin/products/:id/edit', requireAdmin, async (req, res) => {
  const product = await dbGet('SELECT * FROM products WHERE id = ?', [
    req.params.id
  ]);
  if (!product) return res.status(404).send('Produktet finnes ikke.');
  const productImages = await getProductImages(product.id);
  res.render('admin/product-form', {
    title: `Rediger ${product.name}`,
    product,
    productImages,
    pageScript: 'admin',
    bodyClass: 'admin-layout'
  });
});

app.post('/admin/products/:id', requireAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery_images', maxCount: 12 }
]), async (req, res) => {
  const product = await dbGet('SELECT * FROM products WHERE id = ?', [
    req.params.id
  ]);
  if (!product) return res.status(404).send('Produktet finnes ikke.');

  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();
  const price_cents = parsePriceToCents(req.body.price);
  const is_featured = req.body.is_featured ? 1 : 0;
  const image_url = (req.body.image_url || '').trim();
  const imageFile = req.files && req.files.image ? req.files.image[0] : null;
  const galleryFiles = req.files && req.files.gallery_images
    ? req.files.gallery_images
    : [];
  const galleryPaths = galleryFiles.map((file) => `/uploads/${file.filename}`);
  const image_path = imageFile
    ? `/uploads/${imageFile.filename}`
    : image_url || product.image_path;

  if (!name || !description || price_cents === null) {
    return res.render('admin/product-form', {
      title: `Rediger ${product.name}`,
      product: {
        ...product,
        name,
        description,
        price_cents: price_cents || product.price_cents,
        image_path,
        is_featured
      },
      productImages: await getProductImages(product.id),
      error: 'Fyll inn produktnavn, beskrivelse og pris.',
      pageScript: 'admin',
      bodyClass: 'admin-layout'
    });
  }

  const slug = await generateUniqueSlug(name, product.id);
  const timestamp = new Date().toISOString();
  await dbRun(
    `UPDATE products
     SET name = ?, slug = ?, description = ?, price_cents = ?, image_path = ?, is_featured = ?, updated_at = ?
     WHERE id = ?`,
    [
      name,
      slug,
      description,
      price_cents,
      image_path,
      is_featured,
      timestamp,
      product.id
    ]
  );

  if (galleryPaths.length > 0) {
    await addProductImages(product.id, galleryPaths);
  }

  res.redirect('/admin/products');
});

app.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
  await dbRun('DELETE FROM product_images WHERE product_id = ?', [
    req.params.id
  ]);
  await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.redirect('/admin/products');
});

app.post('/admin/products/:id/images/:imageId/delete', requireAdmin, async (req, res) => {
  const productId = Number.parseInt(req.params.id, 10);
  const imageId = Number.parseInt(req.params.imageId, 10);
  if (!productId || !imageId) {
    return res.redirect(`/admin/products/${req.params.id}/edit`);
  }

  const image = await dbGet(
    'SELECT * FROM product_images WHERE id = ? AND product_id = ?',
    [imageId, productId]
  );
  if (!image) {
    return res.redirect(`/admin/products/${req.params.id}/edit`);
  }

  await dbRun('DELETE FROM product_images WHERE id = ?', [imageId]);

  const product = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
  if (product && product.image_path === image.image_path) {
    const nextImage = await dbGet(
      'SELECT image_path FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
      [productId]
    );
    await dbRun('UPDATE products SET image_path = ? WHERE id = ?', [
      nextImage ? nextImage.image_path : '/images/monitor-placeholder.svg',
      productId
    ]);
  }

  return res.redirect(`/admin/products/${req.params.id}/edit`);
});

app.get('/admin/orders', requireAdmin, async (req, res) => {
  const orders = await dbAll('SELECT * FROM orders ORDER BY created_at DESC');
  res.render('admin/orders', {
    title: 'Ordre',
    orders,
    pageScript: 'admin',
    bodyClass: 'admin-layout'
  });
});

app.get('/admin/orders/:id', requireAdmin, async (req, res) => {
  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [
    req.params.id
  ]);
  if (!order) return res.status(404).send('Ordren finnes ikke.');
  const items = await dbAll(
    'SELECT * FROM order_items WHERE order_id = ?',
    [req.params.id]
  );
  res.render('admin/order-detail', {
    title: `Ordre #${order.id}`,
    order,
    items,
    pageScript: 'admin',
    bodyClass: 'admin-layout'
  });
});

app.use((err, req, res, next) => {
  if (
    err instanceof multer.MulterError ||
    (err && err.message && err.message.includes('image'))
  ) {
    return res.status(400).send(err.message);
  }
  console.error(err);
  res.status(500).send('Noe gikk galt.');
});

const handleInitError = (err) => {
  console.error('Failed to initialize database', err);
  if (!isServerless) {
    process.exit(1);
  }
};

if (!isServerless) {
  dbReady
    .then(() => {
      app.listen(PORT, () => {
        console.log(`ProMonitor store running on http://localhost:${PORT}`);
      });
    })
    .catch(handleInitError);
} else {
  dbReady.catch(handleInitError);
}

module.exports = app;

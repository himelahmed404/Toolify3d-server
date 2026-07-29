function buildColorVariants(hexList, primaryImage, modalImage) {
  const labels = {
    '#000000': 'Black',
    '#ffffff': 'White',
    '#1db954': 'Toolify Green',
    '#3d3d3d': 'Dark Gray',
    '#888888': 'Gray',
  };

  return hexList.map((hex, index) => ({
    hex,
    label: labels[hex] || hex,
    image: index === 0 ? primaryImage : modalImage || primaryImage,
  }));
}

const PRODUCTS = [
  {
    name: 'Planetary Gearbox',
    price: 24.0,
    material: 'PLA+',
    category: 'FUNCTIONAL',
    specs: '120g / PLA+ / 0.16mm',
    weight: '120g',
    layerHeight: '0.16mm',
    printTime: '4h 20m',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD9fEi8PFbNIHkKP9dCStH27eGx4NRx-HDr-5cyELoBaAwiB6duXXVv2L_UG9R02mA9MVg7UmeQ69ygkmvXsfCCX-mpIGGcYizq_5rBPSNzhTDmgfN25AvhihN-F2nePhWkY2WgmsLIicfZSVmO4ZH0Ea5Cb69BQMhSevkIPbXtFcTcAY6HCsY69cm5QkacyiSlgu27-vZUGiCDjG9X2lPaASoiI5iEzFAb05Vn-xFIUHlpwIIbioGsuYZRIa4Nj3ZU16BzvzuYBmRy',
    modalImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBv7n3W8WFyxOxlRo-P4BaxUUZG0gnrg0S43sGvYSbeSHNGdwVp9e3h3A2iQOnNMsqvhLGeTidFgS2OXC5J0SLyz6uB60d_3ijiiGwDws4uvALuEiXBA8f9nVMSnyIMtcLHcy20o6LmpyIpIjF7v8KUr0xIUKVG75U5A_LEpTXMd5H3mYnI-xcZj3FVrO7u5zKUvTTutWuORYDvoiVKZN3y-RHiC-l4oxUgUJO3m_8BzHyhrgbEAYH-mU83rEmihUh0xcCK_Spe4Ls0',
    featured: true,
  },
  {
    name: 'Articulated Dragon',
    price: 35.0,
    material: 'TPU',
    category: 'HOBBY',
    specs: '85g / TPU / 0.20mm',
    weight: '85g',
    layerHeight: '0.20mm',
    printTime: '6h 10m',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDPPcyOrxEGoLx2nZ7MprWIQ5nLLLiqOv3suGIVgFcb-W07GkesGfzPfHpMq50gs7PvCoOivYqA-0H-3Do7kCl154irg8Sx8C4WV9OOZfsCuuhdQFK1l5p4CAjz3d1ogXuMZQvZ_L-3_NebVkHtBXiFW-1iuw9qMIO5CIlfu8EIDgWZ-7j_xPNy8LKTWokoWXnSW7eVH_nTA_5-N2hDfz2low1oTS_7WRH8zxCzDmUB9GHX1sIDlLegyJBqM1eyhp81fW_Zj3_3uVYl',
    modalImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDPPcyOrxEGoLx2nZ7MprWIQ5nLLLiqOv3suGIVgFcb-W07GkesGfzPfHpMq50gs7PvCoOivYqA-0H-3Do7kCl154irg8Sx8C4WV9OOZfsCuuhdQFK1l5p4CAjz3d1ogXuMZQvZ_L-3_NebVkHtBXiFW-1iuw9qMIO5CIlfu8EIDgWZ-7j_xPNy8LKTWokoWXnSW7eVH_nTA_5-N2hDfz2low1oTS_7WRH8zxCzDmUB9GHX1sIDlLegyJBqM1eyhp81fW_Zj3_3uVYl',
    featured: true,
  },
  {
    name: 'Heavy Duty Bracket',
    price: 18.5,
    material: 'PETG',
    category: 'FUNCTIONAL',
    specs: '210g / PETG / 0.28mm',
    weight: '210g',
    layerHeight: '0.28mm',
    printTime: '5h 45m',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBdkO3rwtsBiPdLfwRJ73TYFdkVMNqNfKrna4yo1qjTc04KmLZFaocqbrH5B-XG5_RB8KPo_YAoefD1lf3Dw1LLwC6OFk1NgY7nKD3WjLlkabsBWv4_QXt0XnHN4RFqbgjHdsaRwORtRvjMjYgOl6CZZ81_yd7ihtVLoQcj-mX2Vrf6hSf46GwYdlS2DfW2Y4K7J1BLbGMAVcqhum6O5GCCRSXEHWjZ8BGz-aWxPu_o83gZqiOnAmpYTWGBmlCXH2uwDQNi19Ie4hjd',
    modalImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBdkO3rwtsBiPdLfwRJ73TYFdkVMNqNfKrna4yo1qjTc04KmLZFaocqbrH5B-XG5_RB8KPo_YAoefD1lf3Dw1LLwC6OFk1NgY7nKD3WjLlkabsBWv4_QXt0XnHN4RFqbgjHdsaRwORtRvjMjYgOl6CZZ81_yd7ihtVLoQcj-mX2Vrf6hSf46GwYdlS2DfW2Y4K7J1BLbGMAVcqhum6O5GCCRSXEHWjZ8BGz-aWxPu_o83gZqiOnAmpYTWGBmlCXH2uwDQNi19Ie4hjd',
    featured: false,
  },
  {
    name: 'Sci-Fi Soldier Mini',
    price: 12.0,
    material: 'RESIN',
    category: 'MINIATURES',
    specs: '15g / Resin / 0.05mm',
    weight: '15g',
    layerHeight: '0.05mm',
    printTime: '2h 30m',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAw99GDNWsbw-2pf_ek5RALitnAqpekiBxb0-sZDSt8satsu9fBWaD53mLZw6JhoYyioFwhUE5zTkSgCh3uAAt6qb1my0Y_AY5OipwFS4ODN8Tue0uq0sR45fJXUSizsnoWpUBSvvEGausQ-6wBeAaCrt1ibkd_cOys1etl72OHCZM4pWML9io4jgtHsoX7bMPbzLHCtCy5uit2w_hX1rIqJj4n3yO-zSLG9r5y6mdVbyqTl6DNFjWw6V3GiHoNYoy53JNQz5NE_yuC',
    modalImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAw99GDNWsbw-2pf_ek5RALitnAqpekiBxb0-sZDSt8satsu9fBWaD53mLZw6JhoYyioFwhUE5zTkSgCh3uAAt6qb1my0Y_AY5OipwFS4ODN8Tue0uq0sR45fJXUSizsnoWpUBSvvEGausQ-6wBeAaCrt1ibkd_cOys1etl72OHCZM4pWML9io4jgtHsoX7bMPbzLHCtCy5uit2w_hX1rIqJj4n3yO-zSLG9r5y6mdVbyqTl6DNFjWw6V3GiHoNYoy53JNQz5NE_yuC',
    featured: false,
  },
].map((product) => {
  const hexList =
    product.name === 'Planetary Gearbox'
      ? ['#000000', '#ffffff', '#1db954']
      : product.name === 'Articulated Dragon'
        ? ['#1db954', '#000000']
        : product.name === 'Heavy Duty Bracket'
          ? ['#3d3d3d', '#000000']
          : ['#888888', '#000000'];

  const colors = buildColorVariants(hexList, product.image, product.modalImage);

  return {
    ...product,
    colors,
    images: [product.image, product.modalImage].filter(
      (img, index, arr) => img && arr.indexOf(img) === index
    ),
  };
});

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI is required');
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db('toolify3d');
  const collection = db.collection('products');

  const count = await collection.countDocuments();
  if (count > 0) {
    console.log(`Products collection already has ${count} documents. Skipping seed.`);
  } else {
    const now = new Date();
    const docs = PRODUCTS.map((product) => ({ available: true, ...product, createdAt: now }));
    const result = await collection.insertMany(docs);
    console.log(`Seeded ${result.insertedCount} products.`);
  }
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
} finally {
  await client.close();
}

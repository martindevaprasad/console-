/**
 * Replace an organization's catalog with a Tamil Nadu–style restaurant menu:
 * categories, menu items, ingredients (stock items), suppliers, per-portion
 * recipes, modifier groups, kitchen stations and 5% GST.
 *
 *   npm run db:seed:tamilnadu -- "Org Name"     (defaults to the only org)
 *
 * Safe to re-run: everything is matched by name. New data is written first;
 * only then is the old catalog retired — items referenced by past orders are
 * deactivated (history and reports stay intact), everything else is deleted.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ------------------------------------------------------------------ ingredients
type Unit = 'kg' | 'L' | 'pcs';
// key, name, unit, category, cost per unit (INR)
const STOCK: [string, string, Unit, string, number][] = [
  ['ponni_rice', 'Ponni Raw Rice', 'kg', 'Grains & Pulses', 62],
  ['idli_rice', 'Idli Rice (Parboiled)', 'kg', 'Grains & Pulses', 48],
  ['seeraga', 'Seeraga Samba Rice', 'kg', 'Grains & Pulses', 150],
  ['urad', 'Urad Dal', 'kg', 'Grains & Pulses', 135],
  ['toor', 'Toor Dal', 'kg', 'Grains & Pulses', 155],
  ['chana', 'Chana Dal', 'kg', 'Grains & Pulses', 100],
  ['moong', 'Moong Dal', 'kg', 'Grains & Pulses', 125],
  ['rava', 'Bombay Rava (Sooji)', 'kg', 'Grains & Pulses', 52],
  ['maida', 'Maida', 'kg', 'Grains & Pulses', 46],
  ['atta', 'Wheat Atta', 'kg', 'Grains & Pulses', 48],
  ['rice_flour', 'Rice Flour', 'kg', 'Grains & Pulses', 55],
  ['semiya', 'Vermicelli (Semiya)', 'kg', 'Grains & Pulses', 95],

  ['chicken', 'Chicken (Broiler, curry cut)', 'kg', 'Meat & Seafood', 230],
  ['country_chicken', 'Country Chicken (Nattu Kozhi)', 'kg', 'Meat & Seafood', 480],
  ['mutton', 'Mutton (Goat)', 'kg', 'Meat & Seafood', 780],
  ['seer', 'Seer Fish (Vanjaram)', 'kg', 'Meat & Seafood', 850],
  ['curry_fish', 'Sankara Fish', 'kg', 'Meat & Seafood', 380],
  ['prawns', 'Prawns (Medium)', 'kg', 'Meat & Seafood', 560],
  ['egg', 'Eggs', 'pcs', 'Meat & Seafood', 6.5],

  ['onion', 'Big Onion', 'kg', 'Vegetables', 38],
  ['shallot', 'Small Onion (Sambar Onion)', 'kg', 'Vegetables', 75],
  ['tomato', 'Tomato', 'kg', 'Vegetables', 32],
  ['potato', 'Potato', 'kg', 'Vegetables', 36],
  ['green_chilli', 'Green Chilli', 'kg', 'Vegetables', 70],
  ['ginger', 'Ginger', 'kg', 'Vegetables', 130],
  ['garlic', 'Garlic', 'kg', 'Vegetables', 170],
  ['curry_leaves', 'Curry Leaves', 'kg', 'Vegetables', 90],
  ['coriander', 'Coriander Leaves', 'kg', 'Vegetables', 90],
  ['mint', 'Mint Leaves', 'kg', 'Vegetables', 110],
  ['drumstick', 'Drumstick', 'kg', 'Vegetables', 65],
  ['brinjal', 'Brinjal (Small)', 'kg', 'Vegetables', 45],
  ['mixed_veg', 'Mixed Vegetables', 'kg', 'Vegetables', 55],
  ['mushroom', 'Button Mushroom', 'kg', 'Vegetables', 260],
  ['coconut', 'Coconut', 'pcs', 'Vegetables', 32],
  ['tender_coconut', 'Tender Coconut', 'pcs', 'Vegetables', 45],
  ['lemon', 'Lemon', 'pcs', 'Vegetables', 4],

  ['gingelly', 'Gingelly Oil', 'L', 'Dairy & Oils', 390],
  ['groundnut_oil', 'Groundnut Oil', 'L', 'Dairy & Oils', 195],
  ['ghee', 'Ghee', 'kg', 'Dairy & Oils', 680],
  ['butter', 'Butter', 'kg', 'Dairy & Oils', 540],
  ['milk', 'Milk', 'L', 'Dairy & Oils', 58],
  ['curd', 'Curd', 'kg', 'Dairy & Oils', 72],
  ['paneer', 'Paneer', 'kg', 'Dairy & Oils', 400],
  ['ice_cream', 'Vanilla Ice Cream', 'L', 'Dairy & Oils', 300],

  ['sambar_powder', 'Sambar Powder', 'kg', 'Spices', 420],
  ['chilli', 'Red Chilli Powder', 'kg', 'Spices', 360],
  ['turmeric', 'Turmeric Powder', 'kg', 'Spices', 260],
  ['coriander_powder', 'Coriander Powder', 'kg', 'Spices', 260],
  ['garam', 'Garam Masala', 'kg', 'Spices', 950],
  ['chettinad', 'Chettinad Masala', 'kg', 'Spices', 720],
  ['pepper', 'Black Pepper', 'kg', 'Spices', 820],
  ['mustard', 'Mustard Seeds', 'kg', 'Spices', 160],
  ['cumin', 'Cumin Seeds', 'kg', 'Spices', 480],
  ['fennel', 'Fennel Seeds', 'kg', 'Spices', 320],
  ['salt', 'Salt', 'kg', 'Spices', 22],
  ['tamarind', 'Tamarind', 'kg', 'Spices', 190],
  ['idli_podi', 'Idli Podi (Gunpowder)', 'kg', 'Spices', 380],

  ['sugar', 'Sugar', 'kg', 'Dry Goods', 46],
  ['jaggery', 'Jaggery', 'kg', 'Dry Goods', 75],
  ['cashew', 'Cashew Nuts', 'kg', 'Dry Goods', 950],
  ['almond', 'Almonds', 'kg', 'Dry Goods', 1000],
  ['cardamom', 'Cardamom', 'kg', 'Dry Goods', 2600],
  ['badam_pisin', 'Badam Pisin (Almond Gum)', 'kg', 'Dry Goods', 1200],
  ['coffee', 'Filter Coffee Powder', 'kg', 'Beverages', 720],
  ['tea', 'Tea Dust', 'kg', 'Beverages', 460],
  ['nannari', 'Nannari Syrup', 'L', 'Beverages', 280],
  ['rose', 'Rose Syrup', 'L', 'Beverages', 260],
  ['jamun_mix', 'Gulab Jamun Mix', 'kg', 'Dry Goods', 300],
];

const SUPPLIERS: { name: string; contactName: string; phone: string; address: string; leadTimeDays: number; categories: string[] }[] = [
  { name: 'Koyambedu Fresh Vegetables', contactName: 'Murugan S', phone: '+91 98400 11223', address: 'Koyambedu Wholesale Market, Chennai', leadTimeDays: 1, categories: ['Vegetables'] },
  { name: 'Chennai Spice & Grain Traders', contactName: 'Lakshmi R', phone: '+91 98410 44556', address: 'Kothawal Chavadi, George Town, Chennai', leadTimeDays: 3, categories: ['Grains & Pulses', 'Spices', 'Dry Goods', 'Beverages'] },
  { name: 'Kaveri Dairy & Oils', contactName: 'Senthil K', phone: '+91 94440 77889', address: 'Ambattur Industrial Estate, Chennai', leadTimeDays: 1, categories: ['Dairy & Oils'] },
  { name: 'Kasimedu Fish & Meat Suppliers', contactName: 'Arumugam P', phone: '+91 90030 22334', address: 'Kasimedu Fishing Harbour, Chennai', leadTimeDays: 1, categories: ['Meat & Seafood'] },
];

// ------------------------------------------------------------------ recipe building blocks (per portion)
type Lines = Record<string, number>;
const mix = (...parts: Lines[]): Lines => {
  const out: Lines = {};
  for (const p of parts) for (const [k, v] of Object.entries(p)) out[k] = (out[k] || 0) + v;
  return out;
};
const times = (l: Lines, n: number): Lines => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, v * n]));

const SAMBAR: Lines = { toor: 0.012, sambar_powder: 0.004, tamarind: 0.003, shallot: 0.012, tomato: 0.012, drumstick: 0.01, gingelly: 0.002, mustard: 0.0005, curry_leaves: 0.001, salt: 0.002 };
const COCONUT_CHUTNEY: Lines = { coconut: 0.06, chana: 0.003, green_chilli: 0.002, mustard: 0.0005, curry_leaves: 0.0005, groundnut_oil: 0.002, salt: 0.001 };
const TOMATO_CHUTNEY: Lines = { tomato: 0.03, onion: 0.015, chilli: 0.0015, gingelly: 0.002, salt: 0.001 };
const TIFFIN_SIDES = mix(SAMBAR, COCONUT_CHUTNEY, TOMATO_CHUTNEY);
const IDLI_BATTER: Lines = { idli_rice: 0.03, urad: 0.0075, salt: 0.001 }; // per idli
const DOSA_BATTER: Lines = { idli_rice: 0.05, ponni_rice: 0.01, urad: 0.012, salt: 0.002, groundnut_oil: 0.008 };
const POTATO_MASALA: Lines = { potato: 0.1, onion: 0.03, green_chilli: 0.003, turmeric: 0.0005, groundnut_oil: 0.006, mustard: 0.0005, curry_leaves: 0.0005, salt: 0.001 };
const GRAVY_BASE: Lines = { onion: 0.06, tomato: 0.05, ginger: 0.006, garlic: 0.006, groundnut_oil: 0.02, salt: 0.003, curry_leaves: 0.001, coriander: 0.003 };
const KUZHAMBU_BASE: Lines = { tamarind: 0.015, shallot: 0.04, tomato: 0.03, garlic: 0.008, sambar_powder: 0.012, gingelly: 0.02, mustard: 0.001, fennel: 0.001, curry_leaves: 0.001, salt: 0.003 };
const RAITA: Lines = { curd: 0.05, onion: 0.02 };
const BRINJAL_GRAVY: Lines = { brinjal: 0.04, tamarind: 0.003, gingelly: 0.006, sambar_powder: 0.003 };
const BIRYANI_BASE = mix({ seeraga: 0.15, onion: 0.05, tomato: 0.04, ginger: 0.006, garlic: 0.006, mint: 0.004, coriander: 0.004, green_chilli: 0.004, garam: 0.003, ghee: 0.01, groundnut_oil: 0.015, curd: 0.03, lemon: 0.25, salt: 0.004 }, RAITA, BRINJAL_GRAVY);
const PAROTTA: Lines = { maida: 0.07, groundnut_oil: 0.012, milk: 0.01, sugar: 0.002, salt: 0.001 }; // per piece
const SALNA: Lines = { onion: 0.03, tomato: 0.03, coconut: 0.08, chilli: 0.003, garam: 0.001, groundnut_oil: 0.008, salt: 0.002 };
const RICE: Lines = { ponni_rice: 0.12 };
const MEALS_SIDES = mix(SAMBAR, KUZHAMBU_BASE, { toor: 0.015, mixed_veg: 0.12, coconut: 0.1, curd: 0.08, milk: 0.05, sugar: 0.01, semiya: 0.01, urad: 0.01, ghee: 0.005, lemon: 0.25, salt: 0.003 });
const TEMPERED_RICE: Lines = { ponni_rice: 0.12, groundnut_oil: 0.012, mustard: 0.001, urad: 0.003, chana: 0.003, curry_leaves: 0.001, cashew: 0.005, salt: 0.002 };

// ------------------------------------------------------------------ menu
const STATIONS = ['Tiffin Counter', 'Meals & Curry', 'Biryani & Parotta', 'Beverages & Sweets'] as const;
type Station = typeof STATIONS[number];
const STATION_COLORS = ['#7c3aed', '#10b981', '#ef4444', '#f59e0b'];

interface Item { name: string; price: number; desc: string; dietary: string[]; prep: number; recipe: Lines }
interface Cat { name: string; desc: string; color: string; station: Station; items: Item[] }

const VEG = ['VEGETARIAN'];
const VEG_GF = ['VEGETARIAN', 'GLUTEN_FREE'];
const VEGAN_GF = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE'];
const NV_SPICY = ['SPICY'];

const MENU: Cat[] = [
  {
    name: 'Tiffin', desc: 'Breakfast and evening tiffin with sambar & chutneys', color: '#f59e0b', station: 'Tiffin Counter', items: [
      { name: 'Idli (2 pcs)', price: 40, desc: 'Steamed rice cakes with sambar and chutneys', dietary: VEGAN_GF, prep: 5, recipe: mix(times(IDLI_BATTER, 2), TIFFIN_SIDES) },
      { name: 'Ghee Podi Idli', price: 80, desc: 'Mini idlis tossed in ghee and gunpowder', dietary: VEG_GF, prep: 7, recipe: mix(times(IDLI_BATTER, 3), { ghee: 0.015, idli_podi: 0.015 }, COCONUT_CHUTNEY) },
      { name: 'Medu Vada (2 pcs)', price: 50, desc: 'Crisp urad dal fritters with sambar and chutney', dietary: VEGAN_GF, prep: 8, recipe: mix({ urad: 0.05, onion: 0.01, green_chilli: 0.002, ginger: 0.002, pepper: 0.0005, curry_leaves: 0.001, salt: 0.001, groundnut_oil: 0.015 }, SAMBAR, COCONUT_CHUTNEY) },
      { name: 'Sambar Vada', price: 60, desc: 'Medu vada soaked in hot sambar', dietary: VEGAN_GF, prep: 8, recipe: mix({ urad: 0.03, onion: 0.005, green_chilli: 0.001, salt: 0.001, groundnut_oil: 0.015 }, times(SAMBAR, 1.5)) },
      { name: 'Ven Pongal', price: 80, desc: 'Rice and moong dal with ghee, pepper and cashew', dietary: VEG_GF, prep: 8, recipe: mix({ ponni_rice: 0.07, moong: 0.03, ghee: 0.012, pepper: 0.002, cumin: 0.001, ginger: 0.003, cashew: 0.005, curry_leaves: 0.001, salt: 0.002 }, SAMBAR, COCONUT_CHUTNEY) },
      { name: 'Rava Upma', price: 60, desc: 'Semolina with vegetables, ginger and curry leaves', dietary: ['VEGAN', 'VEGETARIAN'], prep: 8, recipe: mix({ rava: 0.08, onion: 0.03, mixed_veg: 0.03, green_chilli: 0.002, ginger: 0.003, groundnut_oil: 0.01, mustard: 0.0005, urad: 0.002, curry_leaves: 0.001, salt: 0.002 }, COCONUT_CHUTNEY) },
      { name: 'Kuzhi Paniyaram', price: 70, desc: 'Pan-fried dumplings from dosa batter with onion and chilli', dietary: VEGAN_GF, prep: 10, recipe: mix(times(DOSA_BATTER, 1.2), { onion: 0.02, green_chilli: 0.002, curry_leaves: 0.001 }, COCONUT_CHUTNEY, TOMATO_CHUTNEY) },
      { name: 'Idiyappam with Coconut Milk', price: 70, desc: 'String hoppers with sweetened coconut milk', dietary: VEGAN_GF, prep: 8, recipe: { rice_flour: 0.08, coconut: 0.25, sugar: 0.015, cardamom: 0.0002, salt: 0.001 } },
      { name: 'Appam with Coconut Milk', price: 80, desc: 'Lacy fermented rice pancakes, 2 pcs', dietary: VEGAN_GF, prep: 10, recipe: { ponni_rice: 0.08, coconut: 0.3, sugar: 0.015, salt: 0.001 } },
      { name: 'Poori Masala', price: 70, desc: 'Puffed wheat bread (2 pcs) with potato masala', dietary: ['VEGAN', 'VEGETARIAN'], prep: 8, recipe: mix({ atta: 0.08, groundnut_oil: 0.03, salt: 0.001 }, POTATO_MASALA) },
    ],
  },
  {
    name: 'Dosa Varieties', desc: 'Fresh off the tawa with sambar & chutneys', color: '#ef4444', station: 'Tiffin Counter', items: [
      { name: 'Plain Dosa', price: 60, desc: 'Thin crisp rice and lentil crepe', dietary: VEGAN_GF, prep: 6, recipe: mix(DOSA_BATTER, TIFFIN_SIDES) },
      { name: 'Masala Dosa', price: 85, desc: 'Crisp dosa filled with potato masala', dietary: VEGAN_GF, prep: 8, recipe: mix(DOSA_BATTER, POTATO_MASALA, TIFFIN_SIDES) },
      { name: 'Ghee Roast Dosa', price: 110, desc: 'Paper-thin dosa roasted in pure ghee', dietary: VEG_GF, prep: 8, recipe: mix(times(DOSA_BATTER, 1.3), { ghee: 0.025 }, TIFFIN_SIDES) },
      { name: 'Onion Rava Dosa', price: 100, desc: 'Lacy semolina dosa with onion, pepper and cumin', dietary: ['VEGAN', 'VEGETARIAN'], prep: 12, recipe: mix({ rava: 0.05, rice_flour: 0.03, maida: 0.01, onion: 0.04, green_chilli: 0.003, pepper: 0.001, cumin: 0.001, groundnut_oil: 0.015, salt: 0.002 }, TIFFIN_SIDES) },
      { name: 'Podi Dosa', price: 90, desc: 'Dosa smeared with gunpowder and gingelly oil', dietary: VEGAN_GF, prep: 7, recipe: mix(DOSA_BATTER, { idli_podi: 0.015, gingelly: 0.008 }, TIFFIN_SIDES) },
      { name: 'Onion Uthappam', price: 90, desc: 'Thick dosa topped with onion, chilli and coriander', dietary: VEGAN_GF, prep: 10, recipe: mix(times(DOSA_BATTER, 1.4), { onion: 0.05, green_chilli: 0.003, coriander: 0.003 }, TIFFIN_SIDES) },
      { name: 'Egg Dosa', price: 90, desc: 'Dosa layered with spiced egg', dietary: ['GLUTEN_FREE'], prep: 8, recipe: mix(DOSA_BATTER, { egg: 1, onion: 0.015, pepper: 0.0005 }, TIFFIN_SIDES) },
      { name: 'Set Dosa with Vada Curry', price: 90, desc: 'Three soft spongy dosas with Chennai-style vada curry', dietary: VEGAN_GF, prep: 10, recipe: mix(times(DOSA_BATTER, 1.5), { chana: 0.03, onion: 0.04, tomato: 0.03, garam: 0.001, fennel: 0.001, groundnut_oil: 0.015, salt: 0.002 }) },
    ],
  },
  {
    name: 'Meals', desc: 'Banana-leaf meals and variety rice', color: '#10b981', station: 'Meals & Curry', items: [
      { name: 'Tamil Nadu Veg Meals', price: 180, desc: 'Unlimited rice, sambar, kuzhambu, rasam, poriyal, kootu, curd, appalam and payasam', dietary: VEG_GF, prep: 5, recipe: mix(times(RICE, 2), MEALS_SIDES) },
      { name: 'Mini Meals', price: 130, desc: 'Rice with sambar, rasam, poriyal, curd and appalam', dietary: VEG_GF, prep: 5, recipe: mix(times(RICE, 1.3), SAMBAR, { mixed_veg: 0.08, curd: 0.06, coconut: 0.05, salt: 0.002 }) },
      { name: 'Non-Veg Meals', price: 320, desc: 'Veg meals with chicken kuzhambu, fish kuzhambu and chicken fry', dietary: ['GLUTEN_FREE'], prep: 8, recipe: mix(times(RICE, 2), MEALS_SIDES, { chicken: 0.12, curry_fish: 0.06, chettinad: 0.006 }, times(GRAVY_BASE, 0.5)) },
      { name: 'Curd Rice', price: 80, desc: 'Creamy curd rice with tempering and pickle', dietary: VEG_GF, prep: 4, recipe: { ponni_rice: 0.1, curd: 0.15, milk: 0.05, mustard: 0.0005, urad: 0.002, green_chilli: 0.002, ginger: 0.002, curry_leaves: 0.001, groundnut_oil: 0.003, salt: 0.002 } },
      { name: 'Sambar Rice', price: 90, desc: 'Rice cooked with sambar, ghee and vegetables', dietary: VEG_GF, prep: 5, recipe: mix({ ponni_rice: 0.1, ghee: 0.01 }, times(SAMBAR, 1.5), { mixed_veg: 0.05 }) },
      { name: 'Lemon Rice', price: 80, desc: 'Tangy lemon rice with peanuts and curry leaves', dietary: VEGAN_GF, prep: 4, recipe: mix(TEMPERED_RICE, { lemon: 1, turmeric: 0.0005, green_chilli: 0.002 }) },
      { name: 'Puliyodarai', price: 80, desc: 'Temple-style tamarind rice', dietary: VEGAN_GF, prep: 4, recipe: mix(TEMPERED_RICE, { tamarind: 0.015, sambar_powder: 0.004, jaggery: 0.004, gingelly: 0.008 }) },
    ],
  },
  {
    name: 'Chettinad Specials', desc: 'Fiery Karaikudi-style meat and seafood', color: '#ef4444', station: 'Meals & Curry', items: [
      { name: 'Chicken Chettinad', price: 260, desc: 'Chicken in roasted Chettinad masala with coconut', dietary: ['SPICY', 'GLUTEN_FREE'], prep: 18, recipe: mix({ chicken: 0.25, chettinad: 0.012, coconut: 0.15, pepper: 0.002, fennel: 0.001 }, GRAVY_BASE) },
      { name: 'Pepper Chicken Fry', price: 240, desc: 'Dry-roasted chicken with crushed black pepper', dietary: ['SPICY', 'GLUTEN_FREE'], prep: 15, recipe: mix({ chicken: 0.25, pepper: 0.008, fennel: 0.001 }, times(GRAVY_BASE, 0.7)) },
      { name: 'Chicken 65', price: 220, desc: 'Crisp deep-fried spicy chicken', dietary: NV_SPICY, prep: 12, recipe: { chicken: 0.22, chilli: 0.006, ginger: 0.005, garlic: 0.005, rice_flour: 0.015, maida: 0.01, curd: 0.02, egg: 0.5, curry_leaves: 0.002, lemon: 0.5, groundnut_oil: 0.05, salt: 0.003 } },
      { name: 'Nattu Kozhi Kuzhambu', price: 360, desc: 'Country chicken curry with shallots and gingelly oil', dietary: ['SPICY', 'GLUTEN_FREE'], prep: 25, recipe: mix({ country_chicken: 0.25, chettinad: 0.012, shallot: 0.05, gingelly: 0.015 }, GRAVY_BASE) },
      { name: 'Mutton Chukka', price: 420, desc: 'Dry mutton roast with shallots, pepper and curry leaves', dietary: ['SPICY', 'GLUTEN_FREE'], prep: 25, recipe: mix({ mutton: 0.22, shallot: 0.06, pepper: 0.005, chettinad: 0.008, curry_leaves: 0.002 }, times(GRAVY_BASE, 0.6)) },
      { name: 'Mutton Kola Urundai', price: 320, desc: 'Spiced minced-mutton balls, Chettinad style (6 pcs)', dietary: NV_SPICY, prep: 15, recipe: { mutton: 0.13, chana: 0.02, coconut: 0.1, shallot: 0.03, fennel: 0.002, garam: 0.002, ginger: 0.004, garlic: 0.004, groundnut_oil: 0.04, salt: 0.003 } },
      { name: 'Vanjaram Fish Fry', price: 450, desc: 'Seer fish slices in red masala, shallow fried', dietary: ['SPICY', 'GLUTEN_FREE'], prep: 12, recipe: { seer: 0.18, chilli: 0.008, turmeric: 0.001, ginger: 0.004, garlic: 0.004, rice_flour: 0.01, lemon: 0.5, groundnut_oil: 0.03, curry_leaves: 0.001, salt: 0.003 } },
      { name: 'Meen Kuzhambu', price: 280, desc: 'Tangy tamarind fish curry with gingelly oil', dietary: ['SPICY', 'GLUTEN_FREE', 'DAIRY_FREE'], prep: 18, recipe: mix({ curry_fish: 0.2 }, KUZHAMBU_BASE, { coconut: 0.08 }) },
      { name: 'Prawn Thokku', price: 320, desc: 'Prawns cooked down in a thick spicy onion-tomato masala', dietary: ['SPICY', 'GLUTEN_FREE'], prep: 15, recipe: mix({ prawns: 0.18, chettinad: 0.008 }, GRAVY_BASE) },
      { name: 'Egg Kalakki', price: 60, desc: 'Madurai-style soft-scrambled egg omelette', dietary: ['GLUTEN_FREE'], prep: 5, recipe: { egg: 2, onion: 0.02, pepper: 0.0005, groundnut_oil: 0.008, salt: 0.001 } },
    ],
  },
  {
    name: 'Veg Gravies & Kuzhambu', desc: 'Kuzhambu, kurma and Chettinad veg', color: '#3b82f6', station: 'Meals & Curry', items: [
      { name: 'Vegetable Kurma', price: 160, desc: 'Mixed vegetables in coconut-cashew gravy', dietary: VEG_GF, prep: 12, recipe: mix({ mixed_veg: 0.18, coconut: 0.15, cashew: 0.008, fennel: 0.001, garam: 0.001 }, GRAVY_BASE) },
      { name: 'Ennai Kathirikai Kuzhambu', price: 160, desc: 'Stuffed baby brinjal in tamarind gravy', dietary: VEGAN_GF, prep: 15, recipe: mix({ brinjal: 0.18 }, KUZHAMBU_BASE) },
      { name: 'Vatha Kuzhambu', price: 150, desc: 'Sun-dried berry tamarind kuzhambu', dietary: VEGAN_GF, prep: 12, recipe: times(KUZHAMBU_BASE, 1.5) },
      { name: 'Paneer Chettinad', price: 220, desc: 'Paneer in roasted Chettinad masala', dietary: ['VEGETARIAN', 'SPICY', 'GLUTEN_FREE'], prep: 15, recipe: mix({ paneer: 0.15, chettinad: 0.01, coconut: 0.1 }, GRAVY_BASE) },
      { name: 'Mushroom Pepper Fry', price: 200, desc: 'Mushrooms tossed with pepper, shallots and curry leaves', dietary: ['VEGAN', 'VEGETARIAN', 'SPICY', 'GLUTEN_FREE'], prep: 12, recipe: mix({ mushroom: 0.2, pepper: 0.006, shallot: 0.04 }, times(GRAVY_BASE, 0.6)) },
    ],
  },
  {
    name: 'Biryani', desc: 'Seeraga samba biryani with raita and brinjal gravy', color: '#7c3aed', station: 'Biryani & Parotta', items: [
      { name: 'Dindigul Chicken Biryani', price: 260, desc: 'Seeraga samba rice dum-cooked with chicken and pepper', dietary: ['SPICY', 'GLUTEN_FREE'], prep: 10, recipe: mix(BIRYANI_BASE, { chicken: 0.2, pepper: 0.002 }) },
      { name: 'Mutton Biryani', price: 420, desc: 'Seeraga samba rice with tender goat meat', dietary: ['SPICY', 'GLUTEN_FREE'], prep: 10, recipe: mix(BIRYANI_BASE, { mutton: 0.18 }) },
      { name: 'Egg Biryani', price: 190, desc: 'Biryani rice with two masala eggs', dietary: ['GLUTEN_FREE'], prep: 8, recipe: mix(BIRYANI_BASE, { egg: 2 }) },
      { name: 'Veg Biryani', price: 180, desc: 'Seeraga samba rice with garden vegetables', dietary: VEG_GF, prep: 8, recipe: mix(BIRYANI_BASE, { mixed_veg: 0.12 }) },
      { name: 'Kuska (Plain Biryani)', price: 150, desc: 'Biryani-flavoured rice with salna', dietary: VEG_GF, prep: 6, recipe: mix(BIRYANI_BASE, SALNA) },
    ],
  },
  {
    name: 'Parotta & Breads', desc: 'Layered parotta, kothu and chapati with salna', color: '#a3a3a3', station: 'Biryani & Parotta', items: [
      { name: 'Parotta (2 pcs)', price: 60, desc: 'Flaky layered parotta with salna', dietary: VEG, prep: 6, recipe: mix(times(PAROTTA, 2), SALNA) },
      { name: 'Veechu Parotta', price: 70, desc: 'Thin flung parotta, Madurai style', dietary: VEG, prep: 8, recipe: mix(times(PAROTTA, 1.2), SALNA) },
      { name: 'Chicken Kothu Parotta', price: 180, desc: 'Shredded parotta tossed with chicken, egg and salna', dietary: NV_SPICY, prep: 12, recipe: mix(times(PAROTTA, 2), { chicken: 0.1, egg: 1 }, times(GRAVY_BASE, 0.6), SALNA) },
      { name: 'Veg Kothu Parotta', price: 140, desc: 'Shredded parotta with vegetables and salna', dietary: VEG, prep: 10, recipe: mix(times(PAROTTA, 2), { mixed_veg: 0.08 }, times(GRAVY_BASE, 0.5), SALNA) },
      { name: 'Chilli Parotta', price: 150, desc: 'Parotta pieces tossed in spicy chilli masala', dietary: ['VEGETARIAN', 'SPICY'], prep: 10, recipe: mix(times(PAROTTA, 2), { onion: 0.05, green_chilli: 0.005, chilli: 0.004, tomato: 0.03, groundnut_oil: 0.01 }) },
      { name: 'Chapati (2 pcs)', price: 50, desc: 'Whole wheat flatbread with vegetable kurma', dietary: ['VEGAN', 'VEGETARIAN'], prep: 6, recipe: mix({ atta: 0.08, groundnut_oil: 0.006, salt: 0.001 }, { mixed_veg: 0.06, coconut: 0.05 }) },
    ],
  },
  {
    name: 'Beverages', desc: 'Filter coffee, tea and coolers', color: '#ec4899', station: 'Beverages & Sweets', items: [
      { name: 'Filter Coffee', price: 40, desc: 'Kumbakonam-style degree coffee in dabarah', dietary: VEG_GF, prep: 3, recipe: { coffee: 0.012, milk: 0.12, sugar: 0.012 } },
      { name: 'Masala Tea', price: 30, desc: 'Milk tea with ginger and cardamom', dietary: VEG_GF, prep: 4, recipe: { tea: 0.006, milk: 0.1, sugar: 0.012, ginger: 0.002, cardamom: 0.0002 } },
      { name: 'Jigarthanda', price: 110, desc: 'Madurai special: milk, almond gum, nannari and ice cream', dietary: VEG_GF, prep: 5, recipe: { milk: 0.2, badam_pisin: 0.005, nannari: 0.025, ice_cream: 0.06, sugar: 0.015 } },
      { name: 'Neer Mor', price: 40, desc: 'Spiced buttermilk with ginger, chilli and curry leaves', dietary: VEG_GF, prep: 2, recipe: { curd: 0.08, ginger: 0.002, green_chilli: 0.001, curry_leaves: 0.0005, coriander: 0.001, salt: 0.001 } },
      { name: 'Rose Milk', price: 60, desc: 'Chilled milk with rose syrup', dietary: VEG_GF, prep: 2, recipe: { milk: 0.2, rose: 0.025, sugar: 0.01 } },
      { name: 'Badam Milk', price: 70, desc: 'Hot or cold almond milk with saffron and cardamom', dietary: VEG_GF, prep: 4, recipe: { milk: 0.2, almond: 0.012, sugar: 0.018, cardamom: 0.0002 } },
      { name: 'Nannari Sarbath', price: 50, desc: 'Sarsaparilla root cooler with lemon', dietary: VEGAN_GF, prep: 2, recipe: { nannari: 0.03, lemon: 0.5, sugar: 0.005 } },
    ],
  },
  {
    name: 'Sweets & Desserts', desc: 'Payasam, halwa and traditional sweets', color: '#f59e0b', station: 'Beverages & Sweets', items: [
      { name: 'Rava Kesari', price: 60, desc: 'Semolina sweet with ghee, cashew and cardamom', dietary: ['VEGETARIAN'], prep: 3, recipe: { rava: 0.04, sugar: 0.05, ghee: 0.02, cashew: 0.005, cardamom: 0.0002 } },
      { name: 'Paal Payasam', price: 80, desc: 'Slow-cooked rice and milk kheer', dietary: VEG_GF, prep: 3, recipe: { milk: 0.2, ponni_rice: 0.02, sugar: 0.03, cardamom: 0.0002, cashew: 0.004, ghee: 0.004 } },
      { name: 'Semiya Payasam', price: 70, desc: 'Vermicelli kheer with cashew and raisins', dietary: VEG, prep: 3, recipe: { milk: 0.18, semiya: 0.025, sugar: 0.03, cashew: 0.004, ghee: 0.005, cardamom: 0.0002 } },
      { name: 'Elaneer Payasam', price: 110, desc: 'Tender coconut payasam, served chilled', dietary: VEG_GF, prep: 3, recipe: { tender_coconut: 0.5, milk: 0.15, sugar: 0.03, cardamom: 0.0002 } },
      { name: 'Gulab Jamun (2 pcs)', price: 60, desc: 'Soft milk dumplings in cardamom syrup', dietary: VEG, prep: 2, recipe: { jamun_mix: 0.04, sugar: 0.06, ghee: 0.015, cardamom: 0.0002 } },
      { name: 'Tirunelveli Halwa', price: 90, desc: 'Glossy wheat halwa slow-cooked in ghee', dietary: VEG, prep: 2, recipe: { atta: 0.04, sugar: 0.06, ghee: 0.03, cashew: 0.004 } },
    ],
  },
];

const MODIFIER_GROUPS: { name: string; min: number; max: number; options: [string, number][]; categories?: string[]; products?: string[] }[] = [
  { name: 'Spice Level', min: 0, max: 1, options: [['Mild', 0], ['Medium', 0], ['Chettinad Hot', 0]], categories: ['Chettinad Specials', 'Biryani', 'Parotta & Breads'] },
  { name: 'Tiffin Add-ons', min: 0, max: 4, options: [['Extra Sambar', 0], ['Extra Chutney', 0], ['Extra Ghee', 20], ['Extra Vada (1 pc)', 30]], categories: ['Tiffin', 'Dosa Varieties'] },
  { name: 'Biryani Extras', min: 0, max: 3, options: [['Extra Raita', 20], ['Ennai Kathirikai', 40], ['Boiled Egg', 20]], categories: ['Biryani'] },
  { name: 'Sugar', min: 0, max: 1, options: [['Regular', 0], ['Less Sugar', 0], ['Without Sugar', 0]], products: ['Filter Coffee', 'Masala Tea', 'Badam Milk', 'Jigarthanda'] },
];

const GST_NAME = 'GST 5%';
const GST_RATE = 5;

// ------------------------------------------------------------------ run
const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

async function main() {
  const orgName = process.argv[2];
  const orgs = await prisma.organization.findMany({ where: orgName ? { name: orgName } : {}, select: { id: true, name: true, settings: true } });
  if (orgs.length !== 1) throw new Error(orgName ? `Organization "${orgName}" not found` : `Found ${orgs.length} organizations — pass the name: npm run db:seed:tamilnadu -- "Org Name"`);
  const org = orgs[0];
  const orgId = org.id;
  console.log(`Seeding Tamil Nadu menu into "${org.name}" (${orgId})`);

  const locations = await prisma.location.findMany({ where: { organizationId: orgId }, orderBy: [{ isHeadOffice: 'desc' }, { createdAt: 'asc' }] });
  if (!locations.length) throw new Error('Organization has no locations');

  // 1. Tax: 5% GST as the default rate
  let gst = await prisma.taxRate.findFirst({ where: { organizationId: orgId, name: GST_NAME } });
  gst = gst
    ? await prisma.taxRate.update({ where: { id: gst.id }, data: { rate: GST_RATE, isDefault: true, isActive: true } })
    : await prisma.taxRate.create({ data: { organizationId: orgId, name: GST_NAME, rate: GST_RATE, isDefault: true } });
  await prisma.taxRate.updateMany({ where: { organizationId: orgId, id: { not: gst.id } }, data: { isDefault: false, isActive: false } });
  const settings: any = org.settings && typeof org.settings === 'object' ? org.settings : {};
  await prisma.organization.update({
    where: { id: orgId },
    data: { taxRate: GST_RATE, settings: { ...settings, taxLabel: 'GST', modules: { ...(settings.modules || {}), inventory: true, recipes: true } } },
  });
  console.log(`- Tax: ${GST_NAME} (default); inventory + recipes modules on`);

  // 2. Kitchen stations at every location (routing matches by name)
  for (const loc of locations) {
    for (const [i, name] of STATIONS.entries()) {
      const s = await prisma.kitchenStation.findFirst({ where: { locationId: loc.id, name } });
      if (s) await prisma.kitchenStation.update({ where: { id: s.id }, data: { isActive: true } });
      else await prisma.kitchenStation.create({ data: { locationId: loc.id, name, color: STATION_COLORS[i] } });
    }
    await prisma.kitchenStation.updateMany({ where: { locationId: loc.id, name: { notIn: [...STATIONS] } }, data: { isActive: false } });
  }
  const headStations = await prisma.kitchenStation.findMany({ where: { locationId: locations[0].id } });
  const stationId = (name: string) => headStations.find((s) => s.name === name)!.id;
  console.log(`- Stations at ${locations.length} locations: ${STATIONS.join(', ')}`);

  // 3. Suppliers
  const supplierFor: Record<string, string> = {};
  for (const s of SUPPLIERS) {
    const { categories, ...data } = s;
    const existing = await prisma.supplier.findFirst({ where: { organizationId: orgId, name: s.name } });
    const row = existing
      ? await prisma.supplier.update({ where: { id: existing.id }, data: { ...data, isActive: true } })
      : await prisma.supplier.create({ data: { ...data, organizationId: orgId, paymentTerms: 'Net 7' } });
    for (const c of categories) supplierFor[c] = row.id;
  }
  console.log(`- Suppliers: ${SUPPLIERS.length}`);

  // 4. Ingredients + stock levels at every location
  const stockId: Record<string, string> = {};
  const stockCost: Record<string, number> = {};
  for (const [i, [key, name, unit, category, cost]] of STOCK.entries()) {
    const row = await prisma.stockItem.upsert({
      where: { organizationId_name: { organizationId: orgId, name } },
      create: { organizationId: orgId, name, unit, category, costPerUnit: cost, supplierId: supplierFor[category], sku: `ING-${String(i + 1).padStart(3, '0')}` },
      update: { unit, category, costPerUnit: cost, supplierId: supplierFor[category], isActive: true },
    });
    stockId[key] = row.id;
    stockCost[key] = cost;
    const par = unit === 'pcs' ? (key === 'egg' ? 180 : 60) : category === 'Spices' ? 3 : category === 'Meat & Seafood' ? 12 : 15;
    for (const loc of locations) {
      await prisma.stockLevel.upsert({
        where: { stockItemId_locationId: { stockItemId: row.id, locationId: loc.id } },
        create: { stockItemId: row.id, locationId: loc.id, quantity: par * 1.5, parLevel: par, reorderPoint: round(par * 0.4, 2) },
        update: { parLevel: par, reorderPoint: round(par * 0.4, 2) },
      });
    }
  }
  console.log(`- Ingredients: ${STOCK.length} (stock levels at every location)`);

  // 5. Categories, menu items, recipes
  const keepProductIds = new Set<string>();
  const productIdsByCategory: Record<string, string[]> = {};
  const productIdByName: Record<string, string> = {};
  let sku = 0;
  for (const [ci, c] of MENU.entries()) {
    const cat = await prisma.category.upsert({
      where: { organizationId_name: { organizationId: orgId, name: c.name } },
      create: { organizationId: orgId, name: c.name, description: c.desc, color: c.color, sortOrder: ci },
      update: { description: c.desc, color: c.color, sortOrder: ci, isActive: true },
    });
    productIdsByCategory[c.name] = [];
    for (const [pi, it] of c.items.entries()) {
      sku++;
      for (const k of Object.keys(it.recipe)) if (!stockId[k]) throw new Error(`Recipe for ${it.name} uses unknown ingredient "${k}"`);
      const cost = round(Object.entries(it.recipe).reduce((s, [k, q]) => s + q * stockCost[k], 0), 2);
      const data = {
        description: it.desc, price: it.price, cost, categoryId: cat.id, taxRateId: gst.id, stationId: stationId(c.station),
        dietary: it.dietary, prepMinutes: it.prep, sortOrder: pi, isActive: true, trackStock: false, isOpenPrice: false,
        channels: ['POS', 'ONLINE', 'KIOSK', 'QR'], sku: `TN-${String(sku).padStart(3, '0')}`,
      };
      // Reuse an existing product of the same name — prefer one with order history
      const same = await prisma.product.findMany({ where: { organizationId: orgId, name: it.name }, include: { _count: { select: { orderItems: true } } } });
      same.sort((a, b) => b._count.orderItems - a._count.orderItems);
      const product = same[0]
        ? await prisma.product.update({ where: { id: same[0].id }, data })
        : await prisma.product.create({ data: { ...data, name: it.name, organizationId: orgId } });
      keepProductIds.add(product.id);
      productIdsByCategory[c.name].push(product.id);
      productIdByName[it.name] = product.id;

      await prisma.recipeLine.deleteMany({ where: { productId: product.id } });
      await prisma.recipeLine.createMany({
        data: Object.entries(it.recipe).map(([k, q]) => ({ productId: product.id, stockItemId: stockId[k], quantity: round(q) })),
      });
    }
  }
  console.log(`- Categories: ${MENU.length}; menu items: ${keepProductIds.size} (with recipes)`);

  // 6. Modifier groups
  const keepGroupIds: string[] = [];
  for (const g of MODIFIER_GROUPS) {
    let group = await prisma.modifierGroup.findFirst({ where: { organizationId: orgId, name: g.name } });
    group = group
      ? await prisma.modifierGroup.update({ where: { id: group.id }, data: { minSelect: g.min, maxSelect: g.max, isActive: true } })
      : await prisma.modifierGroup.create({ data: { organizationId: orgId, name: g.name, minSelect: g.min, maxSelect: g.max } });
    keepGroupIds.push(group.id);
    await prisma.modifier.deleteMany({ where: { groupId: group.id } });
    await prisma.modifier.createMany({ data: g.options.map(([name, price], i) => ({ groupId: group!.id, name, price, isDefault: i === 0 && g.min > 0, sortOrder: i })) });
    const productIds = [...(g.categories || []).flatMap((c) => productIdsByCategory[c] || []), ...(g.products || []).map((n) => productIdByName[n]).filter(Boolean)];
    await prisma.productModifierGroup.deleteMany({ where: { groupId: group.id } });
    await prisma.productModifierGroup.createMany({ data: productIds.map((productId) => ({ productId, groupId: group!.id })), skipDuplicates: true });
  }
  console.log(`- Modifier groups: ${MODIFIER_GROUPS.map((g) => g.name).join(', ')}`);

  // 7. Retire the old catalog (only after the new one is fully in place)
  const old = await prisma.product.findMany({ where: { organizationId: orgId, id: { notIn: [...keepProductIds] } }, include: { _count: { select: { orderItems: true } } } });
  const withHistory = old.filter((p) => p._count.orderItems > 0).map((p) => p.id);
  const unused = old.filter((p) => p._count.orderItems === 0).map((p) => p.id);
  if (withHistory.length) await prisma.product.updateMany({ where: { id: { in: withHistory } }, data: { isActive: false } });
  if (unused.length) await prisma.product.deleteMany({ where: { id: { in: unused } } });

  const newCatNames = MENU.map((c) => c.name);
  const oldCats = await prisma.category.findMany({ where: { organizationId: orgId, name: { notIn: newCatNames } }, include: { _count: { select: { products: true } } } });
  const hideCats = oldCats.filter((c) => c._count.products > 0).map((c) => c.id);
  const dropCats = oldCats.filter((c) => c._count.products === 0).map((c) => c.id);
  if (hideCats.length) await prisma.category.updateMany({ where: { id: { in: hideCats } }, data: { isActive: false } });
  if (dropCats.length) await prisma.category.deleteMany({ where: { id: { in: dropCats } } });

  const droppedGroups = await prisma.modifierGroup.deleteMany({ where: { organizationId: orgId, id: { notIn: keepGroupIds } } });
  console.log(`- Old catalog: ${withHistory.length} items hidden (used by past orders), ${unused.length} deleted; ${hideCats.length} categories hidden, ${dropCats.length} deleted; ${droppedGroups.count} modifier groups deleted`);
  console.log('Done.');
}

main()
  .catch((e) => { console.error('Seed failed:', e.message || e); process.exit(1); })
  .finally(() => prisma.$disconnect());

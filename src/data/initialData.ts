import { MenuItem, ShopSettings } from '../types';
import zcbBannerImg from '../assets/images/zcb_banner_header_1789928995398.jpg';
import zcbLogoImg from '../assets/images/zcb_official_logo_1789928982994.jpg';
import biryaniImg from '../assets/images/biryani_logo_1789928299691.jpg';
import coldDrinkImg from '../assets/images/cold_drink_logo_1789928312199.jpg';
import shamiKababImg from '../assets/images/shami_kabab_plate_1789929052587.jpg';
import raitaSaladImg from '../assets/images/raita_and_salad_1789929066338.jpg';

export const INITIAL_SHOP_SETTINGS: ShopSettings = {
  shopNameUr: 'Zaiqa Chicken Biryani',
  shopNameEn: 'Zaiqa Chicken Biryani',
  shortName: 'ZCB',
  taglineUr: 'Food Prepared Fresh on Order',
  taglineEn: 'Food Prepared Fresh on Order',
  address: 'Main Commercial Food Market',
  phone: '0333-7018183 / 0316-7018516',
  footerNoteUr: '★ Food Prepared Fresh on Order ★ Thank You For Visiting ZCB! Please Come Again.',
  footerNoteEn: '★ Food Prepared Fresh on Order ★ Thank You For Visiting ZCB! Please Come Again.',
  logoUrl: zcbLogoImg,
  bannerUrl: zcbBannerImg,
  currencySymbol: 'Rs.',
  printerWidth: '80mm',
  autoPrintOnComplete: true,
  printCopies: 1,
  soundEnabled: true,
  cashierName: 'مزمل',
  voiceAlertEnabled: true,
};

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'biryani-chicken',
    nameUr: 'Chicken Biryani',
    nameEn: 'Chicken Biryani',
    category: 'biryani',
    popular: true,
    isVeg: false,
    imageUrl: biryaniImg,
    portions: [
      { id: 'cb-250g', labelUr: '250g', labelEn: '250g', price: 180, weightOrQty: '250g' },
      { id: 'cb-370g', labelUr: '370g', labelEn: '370g', price: 270, weightOrQty: '370g' },
      { id: 'cb-500g', labelUr: '500g', labelEn: '500g', price: 360, weightOrQty: '500g' },
      { id: 'cb-750g', labelUr: '750g', labelEn: '750g', price: 540, weightOrQty: '750g' },
      { id: 'cb-1kg', labelUr: '01 KG', labelEn: '01 KG', price: 720, weightOrQty: '1 KG' },
    ],
  },
  {
    id: 'biryani-sada',
    nameUr: 'Sada Biryani',
    nameEn: 'Sada Biryani',
    category: 'biryani',
    popular: true,
    isVeg: true,
    imageUrl: biryaniImg,
    portions: [
      { id: 'sb-250g', labelUr: '250g', labelEn: '250g', price: 110, weightOrQty: '250g' },
      { id: 'sb-370g', labelUr: '370g', labelEn: '370g', price: 170, weightOrQty: '370g' },
      { id: 'sb-500g', labelUr: '500g', labelEn: '500g', price: 220, weightOrQty: '500g' },
      { id: 'sb-750g', labelUr: '750g', labelEn: '750g', price: 330, weightOrQty: '750g' },
      { id: 'sb-1kg', labelUr: '01 Kg', labelEn: '01 Kg', price: 440, weightOrQty: '1 Kg' },
    ],
  },
  {
    id: 'side-raita',
    nameUr: 'Raita',
    nameEn: 'Raita',
    category: 'sides',
    defaultPrice: 50,
    popular: true,
    isVeg: true,
    imageUrl: raitaSaladImg,
  },
  {
    id: 'side-salad',
    nameUr: 'Salad',
    nameEn: 'Salad',
    category: 'sides',
    defaultPrice: 50,
    popular: true,
    isVeg: true,
    imageUrl: raitaSaladImg,
  },
  {
    id: 'side-shami-kabab',
    nameUr: 'Shami Kabab',
    nameEn: 'Shami Kabab',
    category: 'kababs',
    defaultPrice: 50,
    popular: true,
    isVeg: false,
    imageUrl: shamiKababImg,
  },
  {
    id: 'side-box-charges',
    nameUr: 'Box Charges',
    nameEn: 'Box Charges',
    category: 'other',
    defaultPrice: 30,
    popular: true,
    isVeg: true,
  },
  {
    id: 'drink-colddrink',
    nameUr: 'Cold Drink 345 ML',
    nameEn: 'Cold Drink 345 ML',
    category: 'drinks',
    defaultPrice: 80,
    popular: true,
    isVeg: true,
    imageUrl: coldDrinkImg,
    portions: [
      { id: 'cd-345ml', labelUr: '345 ML Regular', labelEn: '345 ML Regular', price: 80 },
      { id: 'cd-500ml', labelUr: '500 ML Bottle', labelEn: '500 ML Bottle', price: 120 },
      { id: 'cd-1500ml', labelUr: '1.5 Litre Family', labelEn: '1.5 Litre Family', price: 220 },
    ],
  },
];


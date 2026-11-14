import React, { useState, useEffect, useMemo, useRef } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import * as marketplaceApi from './lib/marketplaceApi';
import SUPABASE_SQL_SCHEMA from '../supabase/schema.sql?raw';
import {
  Search, MapPin, Globe, Heart, Bell, User, Plus, ShieldCheck, Phone, MessageCircle,
  SlidersHorizontal, ChevronDown, ChevronRight, ChevronLeft, Star, Eye, Share2,
  Scale, CheckCircle2, AlertTriangle, Trash2, Edit3, BarChart3, Users, Package,
  Clock, Award, Filter, X, Check, ArrowUpDown, Building2, Wrench, Tractor,
  Truck, Sparkles, Tag, ExternalLink, FileCode2, Copy, LogOut, Lock, Mail,
  Camera, Send, Flag, RefreshCw, Layers, Image as ImageIcon, DollarSign, Menu,
  ShieldAlert, BadgeCheck, TrendingUp, Briefcase, HelpCircle, Info
} from 'lucide-react';

// ============================================================================
// 1. TYPES & DATA INTERFACES
// ============================================================================

type Lang = 'ar' | 'en';
type Currency = 'EGP' | 'USD';
type UserRole = 'guest' | 'buyer' | 'seller' | 'admin';
type ListingType = 'sale' | 'rent';
type ConditionType = 'new' | 'used';
type ListingStatus = 'active' | 'pending' | 'sold' | 'rented' | 'rejected';

interface Category {
  id: string;
  group: 'heavy' | 'agricultural' | 'additional';
  nameAr: string;
  nameEn: string;
  iconKey: string;
  active: boolean;
}

interface Equipment {
  id: string;
  titleAr: string;
  titleEn: string;
  categoryId: string;
  brand: string;
  model: string;
  year: number;
  priceEgp: number;
  originalPriceEgp?: number;
  listingType: ListingType;
  rentPeriod?: 'day' | 'month';
  condition: ConditionType;
  operatingHours: number;
  engineSpecsAr: string;
  engineSpecsEn: string;
  weightTons: number;
  governorateId: string;
  descriptionAr: string;
  descriptionEn: string;
  images: string[];
  sellerId: string;
  sellerNameAr: string;
  sellerNameEn: string;
  sellerVerified: boolean;
  sellerRating: number;
  sellerPhone: string;
  sellerWhatsapp: string;
  status: ListingStatus;
  isFeatured: boolean;
  isBestSeller?: boolean;
  views: number;
  createdAt: string;
  stockCode: string;
}

interface AppUser {
  id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  phone: string;
  role: Exclude<UserRole, 'guest'>;
  companyAr?: string;
  companyEn?: string;
  governorateId: string;
  verified: boolean;
  suspended: boolean;
  rating: number;
  joinedDate: string;
  avatar?: string;
}

interface Inquiry {
  id: string;
  equipmentId: string;
  equipmentTitleAr: string;
  equipmentTitleEn: string;
  sellerId: string;
  buyerName: string;
  buyerPhone: string;
  message: string;
  reply?: string;
  createdAt: string;
  read: boolean;
}

interface ReportItem {
  id: string;
  equipmentId: string;
  equipmentTitleAr: string;
  equipmentTitleEn: string;
  reporterName: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

interface HeroBanner {
  id: string;
  badgeAr: string;
  badgeEn: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  ctaAr: string;
  ctaEn: string;
  filterPreset: { group?: 'heavy' | 'agricultural'; listingType?: ListingType; condition?: ConditionType };
  image: string;
  active: boolean;
}

interface ReviewItem {
  id: string;
  equipmentId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

// ============================================================================
// 2. STATIC DICTIONARIES, GOVERNORATES, CATEGORIES & CURATED MACHINERY IMAGES
// ============================================================================

const EXCHANGE_RATE_USD = 49.5; // 1 USD = 49.5 EGP

const GOVERNORATES = [
  { id: 'all', nameAr: 'كل المحافظات (مصر)', nameEn: 'All Governorates (Egypt)' },
  { id: 'cairo', nameAr: 'القاهرة', nameEn: 'Cairo' },
  { id: 'giza', nameAr: 'الجيزة', nameEn: 'Giza' },
  { id: 'alexandria', nameAr: 'الإسكندرية', nameEn: 'Alexandria' },
  { id: 'sharqia', nameAr: 'الشرقية', nameEn: 'Sharqia' },
  { id: 'dakahlia', nameAr: 'الدقهلية', nameEn: 'Dakahlia' },
  { id: 'beheira', nameAr: 'البحيرة', nameEn: 'Beheira' },
  { id: 'monufia', nameAr: 'المنوفية', nameEn: 'Monufia' },
  { id: 'asyut', nameAr: 'أسيوط', nameEn: 'Asyut' },
  { id: 'aswan', nameAr: 'أسوان', nameEn: 'Aswan' },
  { id: 'suez', nameAr: 'السويس', nameEn: 'Suez' },
];

const BRANDS = [
  'Caterpillar', 'Komatsu', 'JCB', 'Volvo', 'Hitachi',
  'John Deere', 'Massey Ferguson', 'New Holland', 'Kubota',
  'Liebherr', 'Doosan', 'Bobcat', 'Perkins', 'CASE'
];

// High-reliability verified Unsplash industrial/machinery photography
const IMG = {
  excavator1: 'https://images.unsplash.com/photo-1580901368919-7738efb0f87e?auto=format&fit=crop&w=1000&q=80',
  excavator2: 'https://images.unsplash.com/photo-1579412690850-bd41cd0af397?auto=format&fit=crop&w=1000&q=80',
  bulldozer: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
  loader: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1000&q=80',
  crane: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=80',
  forklift: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=80',
  dumptruck: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1000&q=80',
  tractor1: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1000&q=80',
  tractor2: 'https://images.unsplash.com/photo-1530267981375-f0de937f5f13?auto=format&fit=crop&w=1000&q=80',
  harvester: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1000&q=80',
  sprayer: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1000&q=80',
  generator: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=80',
  parts: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&w=1000&q=80',
  roller: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1000&q=80',
};

const INITIAL_CATEGORIES: Category[] = [
  // Heavy Equipment (10)
  { id: 'excavators', group: 'heavy', nameAr: 'حفارات', nameEn: 'Excavators', iconKey: 'excavator', active: true },
  { id: 'bulldozers', group: 'heavy', nameAr: 'بلدوزرات', nameEn: 'Bulldozers', iconKey: 'bulldozer', active: true },
  { id: 'wheel-loaders', group: 'heavy', nameAr: 'لوادر', nameEn: 'Wheel Loaders', iconKey: 'loader', active: true },
  { id: 'cranes', group: 'heavy', nameAr: 'أوناش ورافعات', nameEn: 'Cranes', iconKey: 'crane', active: true },
  { id: 'forklifts', group: 'heavy', nameAr: 'كلاركات (رافعات شوكية)', nameEn: 'Forklifts', iconKey: 'forklift', active: true },
  { id: 'graders', group: 'heavy', nameAr: 'جريدرات تسوية', nameEn: 'Graders', iconKey: 'grader', active: true },
  { id: 'dump-trucks', group: 'heavy', nameAr: 'شاحنات قلاب', nameEn: 'Dump Trucks', iconKey: 'dumptruck', active: true },
  { id: 'road-rollers', group: 'heavy', nameAr: 'هراسات طرق', nameEn: 'Road Rollers', iconKey: 'roller', active: true },
  { id: 'concrete-mixers', group: 'heavy', nameAr: 'خلاطات خرسانة', nameEn: 'Concrete Mixers', iconKey: 'mixer', active: true },
  { id: 'generators', group: 'heavy', nameAr: 'مولدات كهرباء', nameEn: 'Generators', iconKey: 'generator', active: true },
  // Agricultural Equipment (9)
  { id: 'tractors', group: 'agricultural', nameAr: 'جرارات زراعية', nameEn: 'Tractors', iconKey: 'tractor', active: true },
  { id: 'harvesters', group: 'agricultural', nameAr: 'حصادات زراعية', nameEn: 'Harvesters', iconKey: 'harvester', active: true },
  { id: 'sprayers', group: 'agricultural', nameAr: 'رشاشات مبيدات', nameEn: 'Agricultural Sprayers', iconKey: 'sprayer', active: true },
  { id: 'plows', group: 'agricultural', nameAr: 'محاريث', nameEn: 'Plows', iconKey: 'plow', active: true },
  { id: 'seeders', group: 'agricultural', nameAr: 'بذارات', nameEn: 'Seeders', iconKey: 'seeder', active: true },
  { id: 'irrigation', group: 'agricultural', nameAr: 'معدات ري محوري', nameEn: 'Irrigation Equipment', iconKey: 'irrigation', active: true },
  { id: 'agri-trailers', group: 'agricultural', nameAr: 'مقطورات زراعية', nameEn: 'Agricultural Trailers', iconKey: 'trailer', active: true },
  { id: 'hay-balers', group: 'agricultural', nameAr: 'مكابس قش', nameEn: 'Hay Balers', iconKey: 'baler', active: true },
  { id: 'agri-pumps', group: 'agricultural', nameAr: 'طلمبات ومضخات زراعية', nameEn: 'Agricultural Pumps', iconKey: 'pump', active: true },
  // Additional Categories (5)
  { id: 'spare-parts', group: 'additional', nameAr: 'قطع غيار أصلية', nameEn: 'Spare Parts', iconKey: 'parts', active: true },
  { id: 'accessories', group: 'additional', nameAr: 'ملحقات ومرفقات معدات', nameEn: 'Equipment Accessories', iconKey: 'accessory', active: true },
  { id: 'construction-vehicles', group: 'additional', nameAr: 'مركبات إنشاءات', nameEn: 'Construction Vehicles', iconKey: 'vehicle', active: true },
  { id: 'used-equipment', group: 'additional', nameAr: 'معدات مستعملة', nameEn: 'Used Equipment', iconKey: 'used', active: true },
  { id: 'new-equipment', group: 'additional', nameAr: 'معدات جديدة زيرو', nameEn: 'New Equipment', iconKey: 'new', active: true },
];

const INITIAL_USERS: AppUser[] = [
  {
    id: 'seller-1',
    nameAr: 'شركة النيل للمعدات الثقيلة',
    nameEn: 'Nile Heavy Machinery Co.',
    email: 'sales@nileheavy.eg',
    phone: '+201001234567',
    role: 'seller',
    companyAr: 'مجموعة النيل الهندسية',
    companyEn: 'Nile Engineering Group',
    governorateId: 'cairo',
    verified: true,
    suspended: false,
    rating: 4.9,
    joinedDate: '2023-03-15',
  },
  {
    id: 'seller-2',
    nameAr: 'الدلتا للتكنولوجيا الزراعية',
    nameEn: 'Delta AgriTech Egypt',
    email: 'info@deltaagritech.eg',
    phone: '+201098765432',
    role: 'seller',
    companyAr: 'الدلتا جروب للميكنة الزراعية',
    companyEn: 'Delta Agri Mechanization',
    governorateId: 'sharqia',
    verified: true,
    suspended: false,
    rating: 4.8,
    joinedDate: '2023-06-10',
  },
  {
    id: 'seller-3',
    nameAr: 'الإسكندرية لتجارة الأوناش واللوادر',
    nameEn: 'Alexandria Cranes & Loaders',
    email: 'contact@alexcranes.eg',
    phone: '+201122334455',
    role: 'seller',
    companyAr: 'العالمية للمعدات البحرية والبرية',
    companyEn: 'Global Port & Earthmoving',
    governorateId: 'alexandria',
    verified: true,
    suspended: false,
    rating: 4.7,
    joinedDate: '2024-01-20',
  },
  {
    id: 'seller-4',
    nameAr: 'معرض الصعيد للمعدات',
    nameEn: 'Upper Egypt Equipment Yard',
    email: 'sales@saeedmachinery.eg',
    phone: '+201234567890',
    role: 'seller',
    companyAr: 'معرض الصعيد التجاري',
    companyEn: 'Upper Egypt Trading',
    governorateId: 'asyut',
    verified: false,
    suspended: false,
    rating: 4.3,
    joinedDate: '2025-02-01',
  },
  {
    id: 'buyer-1',
    nameAr: 'م. أحمد محمود عبد الله',
    nameEn: 'Eng. Ahmed Mahmoud',
    email: 'ahmed.contractor@gmail.com',
    phone: '+201066554433',
    role: 'buyer',
    companyAr: 'شركة الرواد للمقاولات العامة',
    companyEn: 'Al-Rowad Contracting',
    governorateId: 'giza',
    verified: true,
    suspended: false,
    rating: 5.0,
    joinedDate: '2024-08-12',
  },
  {
    id: 'admin-1',
    nameAr: 'إدارة منصة أليكس تراك',
    nameEn: 'ALEX TRACK Super Admin',
    email: 'admin@alextrack.eg',
    phone: '+201000000001',
    role: 'admin',
    companyAr: 'ALEX TRACK HQ',
    companyEn: 'ALEX TRACK HQ',
    governorateId: 'cairo',
    verified: true,
    suspended: false,
    rating: 5.0,
    joinedDate: '2023-01-01',
  },
];

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'eq-101',
    titleAr: 'حفار كاتربيلر 320D2 بحالة الزيرو استيراد الخارج',
    titleEn: 'Caterpillar 320D2 Hydraulic Excavator - Import Condition',
    categoryId: 'excavators',
    brand: 'Caterpillar',
    model: '320D2 GC',
    year: 2022,
    priceEgp: 4850000,
    originalPriceEgp: 5200000,
    listingType: 'sale',
    condition: 'used',
    operatingHours: 2450,
    engineSpecsAr: 'محرك Cat C7.1 ACERT بقوة 150 حصان - طلمبة هيدروليك أصلية',
    engineSpecsEn: 'Cat C7.1 ACERT 150 HP Diesel Engine - Original Hydraulic Pump',
    weightTons: 21.5,
    governorateId: 'cairo',
    descriptionAr: 'حفار كاتربيلر 320D2 موديل 2022 استيراد أوروبا، فابريكا بالكامل، كاتينة 90%، تكييف ثلاجة، كابينة ROPS، جاهز للعمل الفوري في المواقع الكبرى.',
    descriptionEn: 'European import Caterpillar 320D2 (2022), 100% factory paint, 90% undercarriage life, ice-cold AC, ROPS cabin, ready for immediate heavy-duty deployment.',
    images: [IMG.excavator1, IMG.excavator2, IMG.bulldozer],
    sellerId: 'seller-1',
    sellerNameAr: 'شركة النيل للمعدات الثقيلة',
    sellerNameEn: 'Nile Heavy Machinery Co.',
    sellerVerified: true,
    sellerRating: 4.9,
    sellerPhone: '+201001234567',
    sellerWhatsapp: '201001234567',
    status: 'active',
    isFeatured: true,
    isBestSeller: true,
    views: 1420,
    createdAt: '2026-11-10',
    stockCode: 'AT-CAT-320',
  },
  {
    id: 'eq-102',
    titleAr: 'جرار زراعي جون دير 6155M دفع رباعي جديد زيرو',
    titleEn: 'John Deere 6155M 4WD Heavy Agricultural Tractor - Brand New',
    categoryId: 'tractors',
    brand: 'John Deere',
    model: '6155M',
    year: 2026,
    priceEgp: 3650000,
    originalPriceEgp: 3900000,
    listingType: 'sale',
    condition: 'new',
    operatingHours: 12,
    engineSpecsAr: 'محرك PowerTech 6 سلندر تيربو 155 حصان - ناقل حركة CommandQuad',
    engineSpecsEn: 'PowerTech 6-Cyl Turbo 155 HP - CommandQuad Plus Transmission',
    weightTons: 6.8,
    governorateId: 'sharqia',
    descriptionAr: 'جرار جون دير 6155M موديل 2026 زيرو بضمان الوكيل المعتمد، مثالي لمزارع الاستصلاح الكبرى في توشكى وشرق العوينات والصالحية.',
    descriptionEn: 'Brand new 2026 John Deere 6155M with official dealer warranty. Built for large-scale desert reclamation projects in Toshka, East Oweinat, and Salhia.',
    images: [IMG.tractor1, IMG.tractor2, IMG.harvester],
    sellerId: 'seller-2',
    sellerNameAr: 'الدلتا للتكنولوجيا الزراعية',
    sellerNameEn: 'Delta AgriTech Egypt',
    sellerVerified: true,
    sellerRating: 4.8,
    sellerPhone: '+201098765432',
    sellerWhatsapp: '201098765432',
    status: 'active',
    isFeatured: true,
    isBestSeller: true,
    views: 1185,
    createdAt: '2026-11-11',
    stockCode: 'AT-JD-6155',
  },
  {
    id: 'eq-103',
    titleAr: 'لودر كوماتسو WA470-8 للإيجار الشهري أو البيع',
    titleEn: 'Komatsu WA470-8 Wheel Loader - Monthly Rental or Purchase',
    categoryId: 'wheel-loaders',
    brand: 'Komatsu',
    model: 'WA470-8',
    year: 2023,
    priceEgp: 185000,
    listingType: 'rent',
    rentPeriod: 'month',
    condition: 'used',
    operatingHours: 3100,
    engineSpecsAr: 'محرك Komatsu SAA6D125E-7 بقوة 273 حصان - باكت 4.5 متر مكعب',
    engineSpecsEn: 'Komatsu SAA6D125E-7 273 HP - 4.5 m³ Heavy Rock Bucket',
    weightTons: 24.2,
    governorateId: 'alexandria',
    descriptionAr: 'لودر كوماتسو WA470-8 متاح للإيجار الشهري شامل الصيانة الدورية للمحاجر ومصانع الأسمنت والموانئ البحرية.',
    descriptionEn: 'Komatsu WA470-8 available for monthly rental with full preventative maintenance support for quarries, cement plants, and marine ports.',
    images: [IMG.loader, IMG.dumptruck],
    sellerId: 'seller-3',
    sellerNameAr: 'الإسكندرية لتجارة الأوناش واللوادر',
    sellerNameEn: 'Alexandria Cranes & Loaders',
    sellerVerified: true,
    sellerRating: 4.7,
    sellerPhone: '+201122334455',
    sellerWhatsapp: '201122334455',
    status: 'active',
    isFeatured: true,
    views: 940,
    createdAt: '2026-11-09',
    stockCode: 'AT-KOM-470',
  },
  {
    id: 'eq-104',
    titleAr: 'بلدوزر كاتربيلر D8R بشوكة خلفية وسكينة ثقيلة',
    titleEn: 'Caterpillar D8R Track-Type Tractor Bulldozer with Ripper',
    categoryId: 'bulldozers',
    brand: 'Caterpillar',
    model: 'D8R',
    year: 2021,
    priceEgp: 6400000,
    originalPriceEgp: 6850000,
    listingType: 'sale',
    condition: 'used',
    operatingHours: 4200,
    engineSpecsAr: 'محرك Cat 3406C بقوة 305 حصان - جير باور شيفت 3 سرعات',
    engineSpecsEn: 'Cat 3406C 305 HP Engine - 3-Speed Powershift Transmission',
    weightTons: 37.6,
    governorateId: 'giza',
    descriptionAr: 'بلدوزر كاتربيلر D8R مجهز بـ Single Shank Ripper لأعمال شق الطرق والمحاجر الصخرية، صيانة توكيل منتظمة.',
    descriptionEn: 'Caterpillar D8R equipped with Single Shank Ripper for highway earthworks and rocky quarries. Full dealer maintenance history.',
    images: [IMG.bulldozer, IMG.excavator1],
    sellerId: 'seller-1',
    sellerNameAr: 'شركة النيل للمعدات الثقيلة',
    sellerNameEn: 'Nile Heavy Machinery Co.',
    sellerVerified: true,
    sellerRating: 4.9,
    sellerPhone: '+201001234567',
    sellerWhatsapp: '201001234567',
    status: 'active',
    isFeatured: false,
    isBestSeller: true,
    views: 875,
    createdAt: '2026-11-08',
    stockCode: 'AT-CAT-D8R',
  },
  {
    id: 'eq-105',
    titleAr: 'حصادة قمح وذرة نيو هولاند TC5.90 موديل 2025',
    titleEn: 'New Holland TC5.90 Combine Harvester (2025)',
    categoryId: 'harvesters',
    brand: 'New Holland',
    model: 'TC5.90',
    year: 2025,
    priceEgp: 5100000,
    listingType: 'sale',
    condition: 'new',
    operatingHours: 45,
    engineSpecsAr: 'محرك FPT NEF 6.7 لتر بقوة 258 حصان - خزان حبوب 6400 لتر',
    engineSpecsEn: 'FPT NEF 6.7L 258 HP - 6,400L Grain Tank Capacity',
    weightTons: 11.4,
    governorateId: 'beheira',
    descriptionAr: 'كومباين حصاد حبوب متكامل بهيدر قمح 6 متر وهيدر ذرة 6 صفوف، نظام فصل مزدوج عالي الكفاءة.',
    descriptionEn: 'Complete grain combine harvester with 6m wheat header and 6-row corn header. High-efficiency dual threshing system.',
    images: [IMG.harvester, IMG.tractor2],
    sellerId: 'seller-2',
    sellerNameAr: 'الدلتا للتكنولوجيا الزراعية',
    sellerNameEn: 'Delta AgriTech Egypt',
    sellerVerified: true,
    sellerRating: 4.8,
    sellerPhone: '+201098765432',
    sellerWhatsapp: '201098765432',
    status: 'active',
    isFeatured: true,
    views: 760,
    createdAt: '2026-11-12',
    stockCode: 'AT-NH-590',
  },
  {
    id: 'eq-106',
    titleAr: 'ونش تلسكوبي ليبهر LTM 1070-4.2 حمولة 70 طن',
    titleEn: 'Liebherr LTM 1070-4.2 Mobile All-Terrain Crane (70 Ton)',
    categoryId: 'cranes',
    brand: 'Liebherr',
    model: 'LTM 1070-4.2',
    year: 2020,
    priceEgp: 9200000,
    listingType: 'sale',
    condition: 'used',
    operatingHours: 5100,
    engineSpecsAr: 'محرك Liebherr D936L A6 بقوة 367 حصان - بوم 50 متر',
    engineSpecsEn: 'Liebherr D936L A6 367 HP - 50m Telescopic Boom',
    weightTons: 48.0,
    governorateId: 'alexandria',
    descriptionAr: 'ونش ليبهر 70 طن 4 أكس دفع وتوجيه كلي، كمبيوتر أحمال LICCON2، شهادات فحص سلامة دولية سارية.',
    descriptionEn: 'Liebherr 70-ton 4-axle all-terrain crane with LICCON2 load moment limiter and valid international safety certifications.',
    images: [IMG.crane, IMG.loader],
    sellerId: 'seller-3',
    sellerNameAr: 'الإسكندرية لتجارة الأوناش واللوادر',
    sellerNameEn: 'Alexandria Cranes & Loaders',
    sellerVerified: true,
    sellerRating: 4.7,
    sellerPhone: '+201122334455',
    sellerWhatsapp: '201122334455',
    status: 'active',
    isFeatured: false,
    views: 680,
    createdAt: '2026-11-06',
    stockCode: 'AT-LIE-1070',
  },
  {
    id: 'eq-107',
    titleAr: 'كلارك ديزل JCB 35D حمولة 3.5 طن ساري 4.8 متر',
    titleEn: 'JCB 35D Diesel Forklift - 3.5 Ton Capacity, 4.8m Triplex Mast',
    categoryId: 'forklifts',
    brand: 'JCB',
    model: '35D 4x4',
    year: 2024,
    priceEgp: 1150000,
    originalPriceEgp: 1280000,
    listingType: 'sale',
    condition: 'new',
    operatingHours: 5,
    engineSpecsAr: 'محرك JCB DieselMAX بقوة 63 حصان - إطارات صب لا تثقب',
    engineSpecsEn: 'JCB DieselMAX 63 HP Engine - Solid Puncture-Proof Tires',
    weightTons: 4.9,
    governorateId: 'cairo',
    descriptionAr: 'رافعة شوكية JCB حمولة 3.5 طن بساري ثلاثي 4.8 متر وخاصية Side-Shift لتحريك الشوكة جانبياً، مثالية للمخازن والمصانع.',
    descriptionEn: '3.5-ton JCB forklift with 4.8m triplex mast and hydraulic side-shift. Ideal for logistics warehouses and industrial plants.',
    images: [IMG.forklift, IMG.parts],
    sellerId: 'seller-1',
    sellerNameAr: 'شركة النيل للمعدات الثقيلة',
    sellerNameEn: 'Nile Heavy Machinery Co.',
    sellerVerified: true,
    sellerRating: 4.9,
    sellerPhone: '+201001234567',
    sellerWhatsapp: '201001234567',
    status: 'active',
    isFeatured: false,
    isBestSeller: true,
    views: 615,
    createdAt: '2026-11-05',
    stockCode: 'AT-JCB-35D',
  },
  {
    id: 'eq-108',
    titleAr: 'مولد كهرباء بيركنز 500 ك.ف.أ كاتم صوت استاندباي',
    titleEn: 'Perkins 500 kVA Soundproof Silent Diesel Generator',
    categoryId: 'generators',
    brand: 'Perkins',
    model: '2506A-E15TAG2',
    year: 2026,
    priceEgp: 1980000,
    listingType: 'sale',
    condition: 'new',
    operatingHours: 0,
    engineSpecsAr: 'محرك بيركنز إنجلترا + دينامو Stamford + لوحة تحكم DeepSea ATS',
    engineSpecsEn: 'UK Perkins Engine + Stamford Alternator + DeepSea ATS Panel',
    weightTons: 4.2,
    governorateId: 'suez',
    descriptionAr: 'مولد كهرباء 500 كيلو فولت أمبير بكابينة عازلة للصوت، شامل لوحة التحويل الأوتوماتيكي ATS وضمان عامين.',
    descriptionEn: '500 kVA sound-attenuated canopy generator complete with Automatic Transfer Switch (ATS) and 2-year warranty.',
    images: [IMG.generator, IMG.parts],
    sellerId: 'seller-1',
    sellerNameAr: 'شركة النيل للمعدات الثقيلة',
    sellerNameEn: 'Nile Heavy Machinery Co.',
    sellerVerified: true,
    sellerRating: 4.9,
    sellerPhone: '+201001234567',
    sellerWhatsapp: '201001234567',
    status: 'active',
    isFeatured: false,
    views: 530,
    createdAt: '2026-11-04',
    stockCode: 'AT-PRK-500',
  },
  {
    id: 'eq-109',
    titleAr: 'جرار ماسي فيرجسون MF 385 4WD قوة 85 حصان',
    titleEn: 'Massey Ferguson MF 385 4WD Tractor (85 HP)',
    categoryId: 'tractors',
    brand: 'Massey Ferguson',
    model: 'MF 385',
    year: 2025,
    priceEgp: 1320000,
    originalPriceEgp: 1410000,
    listingType: 'sale',
    condition: 'new',
    operatingHours: 8,
    engineSpecsAr: 'محرك بيركنز 4.41 ديزل 85 حصان - 2 مخرج هيدروليك خلفي',
    engineSpecsEn: 'Perkins 4.41 Diesel 85 HP - Dual Rear Spool Valves',
    weightTons: 3.4,
    governorateId: 'dakahlia',
    descriptionAr: 'الأكثر مبيعاً في الدلتا والصعيد! جرار ماسي فيرجسون 385 دفع رباعي اقتصادي في استهلاك السولار وسهل الصيانة.',
    descriptionEn: 'Egypt’s #1 best-selling utility tractor! Fuel-efficient 4WD Massey Ferguson 385 with easy spare parts availability nationwide.',
    images: [IMG.tractor2, IMG.tractor1],
    sellerId: 'seller-2',
    sellerNameAr: 'الدلتا للتكنولوجيا الزراعية',
    sellerNameEn: 'Delta AgriTech Egypt',
    sellerVerified: true,
    sellerRating: 4.8,
    sellerPhone: '+201098765432',
    sellerWhatsapp: '201098765432',
    status: 'active',
    isFeatured: false,
    isBestSeller: true,
    views: 1590,
    createdAt: '2026-11-12',
    stockCode: 'AT-MF-385',
  },
  {
    id: 'eq-110',
    titleAr: 'شاحنة قلاب فولفو FMX 460 8x4 صندوق 22 متر',
    titleEn: 'Volvo FMX 460 8x4 Heavy Tipper Dump Truck (22 m³)',
    categoryId: 'dump-trucks',
    brand: 'Volvo',
    model: 'FMX 460',
    year: 2022,
    priceEgp: 5450000,
    listingType: 'sale',
    condition: 'used',
    operatingHours: 3800,
    engineSpecsAr: 'محرك Volvo D13K بقوة 460 حصان - فتيس I-Shift أوتوماتيك',
    engineSpecsEn: 'Volvo D13K 460 HP - Automated I-Shift Gearbox',
    weightTons: 32.0,
    governorateId: 'cairo',
    descriptionAr: 'سيارة قلاب فولفو FMX 8x4 صندوق هاردوكس مقاوم للتآكل بسعة 22 متر مكعب، حالة ممتازة جاهزة للترخيص.',
    descriptionEn: 'Volvo FMX 8x4 tipper with 22 m³ Hardox wear-resistant body. Excellent mechanical condition, ready for licensing.',
    images: [IMG.dumptruck, IMG.loader],
    sellerId: 'seller-3',
    sellerNameAr: 'الإسكندرية لتجارة الأوناش واللوادر',
    sellerNameEn: 'Alexandria Cranes & Loaders',
    sellerVerified: true,
    sellerRating: 4.7,
    sellerPhone: '+201122334455',
    sellerWhatsapp: '201122334455',
    status: 'active',
    isFeatured: false,
    views: 720,
    createdAt: '2026-11-03',
    stockCode: 'AT-VOL-460',
  },
  {
    id: 'eq-111',
    titleAr: 'هراس أسفلت وتربة بومج / كاتربيلر CS56B 12 طن للإيجار',
    titleEn: 'Caterpillar CS56B Vibratory Soil Compactor Roller (12 Ton) - Rent',
    categoryId: 'road-rollers',
    brand: 'Caterpillar',
    model: 'CS56B',
    year: 2023,
    priceEgp: 4200,
    listingType: 'rent',
    rentPeriod: 'day',
    condition: 'used',
    operatingHours: 1900,
    engineSpecsAr: 'محرك Cat C4.4 ACERT بقوة 157 حصان - عرض الدرام 2.13 متر',
    engineSpecsEn: 'Cat C4.4 ACERT 157 HP - 2.13m Drum Width',
    weightTons: 11.8,
    governorateId: 'giza',
    descriptionAr: 'هراس دك تربة وأسفلت للإيجار اليومي أو الشهري لمشاريع الطرق والكباري والبنية التحتية.',
    descriptionEn: 'Vibratory compactor roller for daily or monthly rental for highway, bridge, and infrastructure projects.',
    images: [IMG.roller, IMG.bulldozer],
    sellerId: 'seller-1',
    sellerNameAr: 'شركة النيل للمعدات الثقيلة',
    sellerNameEn: 'Nile Heavy Machinery Co.',
    sellerVerified: true,
    sellerRating: 4.9,
    sellerPhone: '+201001234567',
    sellerWhatsapp: '201001234567',
    status: 'active',
    isFeatured: false,
    views: 410,
    createdAt: '2026-11-02',
    stockCode: 'AT-CAT-CS56',
  },
  {
    id: 'eq-112',
    titleAr: 'رشاشة مبيدات زراعية مقطورة 2000 لتر بذراع هيدروليك 18م',
    titleEn: 'Trailed Agricultural Boom Sprayer 2000L with 18m Hydraulic Boom',
    categoryId: 'sprayers',
    brand: 'Kubota',
    model: 'SP-2000H',
    year: 2026,
    priceEgp: 485000,
    listingType: 'sale',
    condition: 'new',
    operatingHours: 0,
    engineSpecsAr: 'طلمبة إيطالي Bertolini 160 لتر/دقيقة - تانك بولي إيثيلين معالج',
    engineSpecsEn: 'Italian Bertolini 160 L/min Pump - UV-Stabilized Poly Tank',
    weightTons: 1.3,
    governorateId: 'monufia',
    descriptionAr: 'رشاشة مبيدات ومغذيات ورقية احترافية للمزارع المفتوحة والبساتين، تحكم كامل من كابينة الجرار.',
    descriptionEn: 'Professional boom sprayer for open-field crops and orchards with full in-cab electronic valve control.',
    images: [IMG.sprayer, IMG.tractor1],
    sellerId: 'seller-2',
    sellerNameAr: 'الدلتا للتكنولوجيا الزراعية',
    sellerNameEn: 'Delta AgriTech Egypt',
    sellerVerified: true,
    sellerRating: 4.8,
    sellerPhone: '+201098765432',
    sellerWhatsapp: '201098765432',
    status: 'active',
    isFeatured: false,
    views: 380,
    createdAt: '2026-11-01',
    stockCode: 'AT-KUB-2000',
  },
  {
    id: 'eq-113',
    titleAr: 'حفار هيتاشي ZX210LC-5G موديل 2020 (بانتظار مراجعة الإدارة)',
    titleEn: 'Hitachi ZX210LC-5G Crawler Excavator 2020 (Pending Admin Review)',
    categoryId: 'excavators',
    brand: 'Hitachi',
    model: 'ZX210LC-5G',
    year: 2020,
    priceEgp: 3450000,
    listingType: 'sale',
    condition: 'used',
    operatingHours: 4950,
    engineSpecsAr: 'محرك Isuzu 6BG1 بقوة 166 حصان - باكت صخري 1.1 متر',
    engineSpecsEn: 'Isuzu 6BG1 166 HP Engine - 1.1 m³ Heavy Rock Bucket',
    weightTons: 21.2,
    governorateId: 'asyut',
    descriptionAr: 'حفار هيتاشي 210 بحالة جيدة جداً جاهز للفحص في أسيوط.',
    descriptionEn: 'Hitachi 210 excavator in very good working order, available for inspection in Asyut.',
    images: [IMG.excavator2, IMG.excavator1],
    sellerId: 'seller-4',
    sellerNameAr: 'معرض الصعيد للمعدات',
    sellerNameEn: 'Upper Egypt Equipment Yard',
    sellerVerified: false,
    sellerRating: 4.3,
    sellerPhone: '+201234567890',
    sellerWhatsapp: '201234567890',
    status: 'pending',
    isFeatured: false,
    views: 45,
    createdAt: new Date().toISOString(),
    stockCode: 'AT-HIT-210',
  },
  {
    id: 'eq-114',
    titleAr: 'طقم قطع غيار وفلاتر أصلية لمحركات كاتربيلر وبيركنز',
    titleEn: 'Genuine OEM Filter & Hydraulic Seal Kit for CAT & Perkins Engines',
    categoryId: 'spare-parts',
    brand: 'Caterpillar',
    model: 'OEM-KIT-320',
    year: 2026,
    priceEgp: 38500,
    originalPriceEgp: 45000,
    listingType: 'sale',
    condition: 'new',
    operatingHours: 0,
    engineSpecsAr: 'فلاتر زيت وسولار وهيدروليك وهواء أصلية مختومة بالباركود',
    engineSpecsEn: 'Original Barcode-Sealed Oil, Fuel, Hydraulic & Air Filters',
    weightTons: 0.05,
    governorateId: 'cairo',
    descriptionAr: 'باقة الصيانة الدورية 1000 ساعة الأصلية لحفارات ولوادر كاتربيلر ومولدات بيركنز مع توصيل سريع لجميع المحافظات.',
    descriptionEn: 'Complete 1,000-hour OEM maintenance filter kit for CAT excavators/loaders and Perkins generators with nationwide shipping.',
    images: [IMG.parts, IMG.generator],
    sellerId: 'seller-1',
    sellerNameAr: 'شركة النيل للمعدات الثقيلة',
    sellerNameEn: 'Nile Heavy Machinery Co.',
    sellerVerified: true,
    sellerRating: 4.9,
    sellerPhone: '+201001234567',
    sellerWhatsapp: '201001234567',
    status: 'active',
    isFeatured: false,
    views: 512,
    createdAt: '2026-11-07',
    stockCode: 'AT-PRT-320',
  },
];

const INITIAL_BANNERS: HeroBanner[] = [
  {
    id: 'ban-1',
    badgeAr: 'المنصة الصناعية الأولى في مصر',
    badgeEn: 'EGYPT’S #1 INDUSTRIAL MARKETPLACE',
    titleAr: 'قوة الأداء في موقعك ومزرعتك مع ALEX TRACK',
    titleEn: 'Power Your Jobsite & Farm with ALEX TRACK',
    subtitleAr: 'اشترِ أو استأجر أحدث المعدات الثقيلة والجرارات الزراعية من وكلاء وتجار معتمدين في جميع محافظات مصر بضمان الفحص والشفافية.',
    subtitleEn: 'Buy, sell, or rent certified heavy construction machinery and agricultural tractors from verified dealers across all Egyptian governorates.',
    ctaAr: 'تصفح المعدات الثقيلة',
    ctaEn: 'Explore Heavy Equipment',
    filterPreset: { group: 'heavy' },
    image: IMG.excavator1,
    active: true,
  },
  {
    id: 'ban-2',
    badgeAr: 'موسم الاستصلاح والزراعة 2026',
    badgeEn: '2026 AGRICULTURAL MECHANIZATION SEASON',
    titleAr: 'أحدث الجرارات والحصادات وأنظمة الري المحوري',
    titleEn: 'Next-Gen Tractors, Harvesters & Pivot Irrigation',
    subtitleAr: 'عروض حصرية على جرارات جون دير وماسي فيرجسون ونيو هولاند مع خدمات ما بعد البيع وتوافر قطع الغيار الأصلية.',
    subtitleEn: 'Exclusive deals on John Deere, Massey Ferguson, and New Holland machinery with nationwide spare parts support.',
    ctaAr: 'استكشف المعدات الزراعية',
    ctaEn: 'Explore Agri Machinery',
    filterPreset: { group: 'agricultural' },
    image: IMG.tractor1,
    active: true,
  },
  {
    id: 'ban-3',
    badgeAr: 'حلول التأجير للمشروعات القومية',
    badgeEn: 'FLEET RENTAL FOR MEGA PROJECTS',
    titleAr: 'استأجر معداتك باليوم أو الشهر بأفضل أسعار السوق',
    titleEn: 'Rent Certified Machinery Daily or Monthly',
    subtitleAr: 'لوادر، حفارات، هراسات، وأوناش جاهزة للتحرك الفوري لمواقع الإنشاءات والطرق في القاهرة، الإسكندرية، والعاصمة الإدارية.',
    subtitleEn: 'Loaders, excavators, compactors, and cranes ready for immediate dispatch across Cairo, Alexandria, and the New Capital.',
    ctaAr: 'عرض معدات الإيجار',
    ctaEn: 'Browse Rental Fleet',
    filterPreset: { listingType: 'rent' },
    image: IMG.loader,
    active: true,
  },
];

const INITIAL_INQUIRIES: Inquiry[] = [
  {
    id: 'inq-1',
    equipmentId: 'eq-101',
    equipmentTitleAr: 'حفار كاتربيلر 320D2 بحالة الزيرو استيراد الخارج',
    equipmentTitleEn: 'Caterpillar 320D2 Hydraulic Excavator - Import Condition',
    sellerId: 'seller-1',
    buyerName: 'م. أحمد محمود عبد الله',
    buyerPhone: '+201066554433',
    message: 'السلام عليكم، هل الحفار متاح للمعاينة غداً في مقر الشركة بالقاهرة؟ وهل السعر قابل للتفاوض البسيط عند الدفع الكاش؟',
    createdAt: '2026-11-13 14:30',
    read: false,
  },
  {
    id: 'inq-2',
    equipmentId: 'eq-102',
    equipmentTitleAr: 'جرار زراعي جون دير 6155M دفع رباعي جديد زيرو',
    equipmentTitleEn: 'John Deere 6155M 4WD Heavy Agricultural Tractor - Brand New',
    sellerId: 'seller-2',
    buyerName: 'شركة الوادي الأخضر للاستصلاح',
    buyerPhone: '+201011223344',
    message: 'نحتاج عرض سعر رسمي لعدد 3 جرارات جون دير 6155M شامل التسليم في مزرعة الصالحية.',
    reply: 'أهلاً بحضرتك، تم تجهيز عرض السعر الرسمي وسيتم التواصل معكم هاتفياً خلال ساعة.',
    createdAt: '2026-11-12 11:15',
    read: true,
  },
];

const INITIAL_REPORTS: ReportItem[] = [
  {
    id: 'rep-1',
    equipmentId: 'eq-113',
    equipmentTitleAr: 'حفار هيتاشي ZX210LC-5G موديل 2020',
    equipmentTitleEn: 'Hitachi ZX210LC-5G Crawler Excavator 2020',
    reporterName: 'م. طارق حسن',
    reason: 'معلومات فنية غير مكتملة / سعر غير واضح',
    details: 'يرجى التأكد من الرقم التسلسلي للمعدة وساعات التشغيل الفعلية قبل اعتماد الإعلان.',
    status: 'open',
    createdAt: '2026-11-13 16:00',
  },
];

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    equipmentId: 'eq-101',
    userName: 'م. كريم الشاذلي - شركة المقاولون المتحدون',
    rating: 5,
    comment: 'تمت معاينة المعدة في ساحة الشركة، الحالة مطابقة تماماً للوصف والصور والطاقم الهندسي محترم جداً.',
    date: '2026-11-11',
  },
  {
    id: 'rev-2',
    equipmentId: 'eq-102',
    userName: 'الحاج محمود العزب - مزارع الصالحية',
    rating: 5,
    comment: 'جرار جبار في الأراضي الصحراوية واستهلاك السولار ممتاز، وخدمة ما بعد البيع من شركة الدلتا فوق الممتازة.',
    date: '2026-11-12',
  },
];

// ============================================================================
// 3. CUSTOM INDUSTRIAL SVG BRAND LOGO & CATEGORY VECTOR ICONS
// ============================================================================

const AlexTrackLogo: React.FC<{ lang: Lang; compact?: boolean }> = ({ lang, compact }) => (
  <div className="flex items-center gap-2.5 select-none group">
    <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-lg shadow-orange-500/25 border border-orange-400/40 group-hover:scale-105 transition-transform">
      <svg viewBox="0 0 48 48" className="w-7 h-7 text-white" fill="none">
        {/* Heavy Track Chassis */}
        <rect x="6" y="30" width="36" height="10" rx="5" stroke="currentColor" strokeWidth="3.2" fill="#0B192C" />
        <circle cx="13" cy="35" r="2.2" fill="#F97316" />
        <circle cx="24" cy="35" r="2.2" fill="#F97316" />
        <circle cx="35" cy="35" r="2.2" fill="#F97316" />
        {/* Industrial Gear & Boom */}
        <path d="M14 29V18L24 10L34 17" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 15L39 22L36 25" stroke="#0B192C" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="21" r="4" fill="#F97316" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    </div>
    <div className="flex flex-col leading-none">
      <div className="flex items-center gap-1">
        <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
          ALEX <span className="text-[#F97316]">TRACK</span>
        </span>
      </div>
      {!compact && (
        <span className="text-[10px] sm:text-[11px] font-medium text-slate-300 mt-0.5 tracking-wide">
          {lang === 'ar' ? 'منصتك الموثوقة للمعدات الثقيلة والزراعية' : 'Your Trusted Heavy Equipment Marketplace'}
        </span>
      )}
    </div>
  </div>
);

const CategoryVectorIcon: React.FC<{ iconKey: string; className?: string }> = ({ iconKey, className = 'w-7 h-7' }) => {
  switch (iconKey) {
    case 'excavator':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className}>
          <rect x="4" y="25" width="20" height="6" rx="3" stroke="currentColor" strokeWidth="2.2" />
          <path d="M8 25V16H17V25" stroke="currentColor" strokeWidth="2.2" />
          <path d="M17 19L25 11L31 18L28 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'bulldozer':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className}>
          <rect x="4" y="24" width="21" height="6" rx="3" stroke="currentColor" strokeWidth="2.2" />
          <path d="M7 24V15H19V24" stroke="currentColor" strokeWidth="2.2" />
          <path d="M29 16C31 19 31 25 28 29H25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M21 21H29" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case 'loader':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className}>
          <circle cx="10" cy="26" r="4" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="22" cy="26" r="4" stroke="currentColor" strokeWidth="2.2" />
          <path d="M7 22V14H18V22" stroke="currentColor" strokeWidth="2.2" />
          <path d="M18 18L28 15L32 23H26" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );
    case 'crane':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className}>
          <path d="M10 30V7L29 14" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 30H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M26 13V22C26 23.5 24 24.5 23 23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'tractor':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className}>
          <circle cx="11" cy="24" r="6" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="26" cy="26" r="4" stroke="currentColor" strokeWidth="2.2" />
          <path d="M11 18V11H20V18H28V23" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );
    case 'harvester':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className}>
          <circle cx="13" cy="25" r="5" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="23" cy="26" r="3.5" stroke="currentColor" strokeWidth="2.2" />
          <path d="M8 20L5 26H9M10 20V12H25V21H17" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return <Wrench className={className} />;
  }
};

// ============================================================================
// 4. SUPABASE SCHEMA & SETUP MODAL COMPONENT
// ============================================================================

// ============================================================================
// 5. MAIN APPLICATION COMPONENT
// ============================================================================

export function App() {
  // --- Global UI & Localization State ---
  const [lang, setLang] = useState<Lang>('ar');
  const [currency, setCurrency] = useState<Currency>('EGP');
  const [activeView, setActiveView] = useState<'home' | 'catalog' | 'details' | 'seller-dashboard' | 'admin-dashboard' | 'profile'>('home');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);

  // --- Marketplace data: Supabase is authoritative when configured; local demo data is isolated otherwise. ---
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(() => {
    if (isSupabaseConfigured) return [];
    try {
      const saved = localStorage.getItem('alextrack_equipment_v1');
      return saved ? JSON.parse(saved) : INITIAL_EQUIPMENT;
    } catch { return INITIAL_EQUIPMENT; }
  });
  const [usersList, setUsersList] = useState<AppUser[]>(() => {
    if (isSupabaseConfigured) return [];
    try {
      const saved = localStorage.getItem('alextrack_users_v1');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch { return INITIAL_USERS; }
  });
  const [categories, setCategories] = useState<Category[]>(isSupabaseConfigured ? [] : INITIAL_CATEGORIES);
  const [banners, setBanners] = useState<HeroBanner[]>(isSupabaseConfigured ? [] : INITIAL_BANNERS);
  const [inquiries, setInquiries] = useState<Inquiry[]>(isSupabaseConfigured ? [] : INITIAL_INQUIRIES);
  const [reports, setReports] = useState<ReportItem[]>(isSupabaseConfigured ? [] : INITIAL_REPORTS);
  const [reviews, setReviews] = useState<ReviewItem[]>(isSupabaseConfigured ? [] : INITIAL_REVIEWS);
  const [backendLoading, setBackendLoading] = useState(isSupabaseConfigured);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // --- User Session ---
  const [currentUser, setCurrentUser] = useState<AppUser | null>(isSupabaseConfigured ? null : INITIAL_USERS[0]);
  const [favorites, setFavorites] = useState<string[]>(isSupabaseConfigured ? [] : ['eq-101', 'eq-102']);
  const [compareIds, setCompareIds] = useState<string[]>(isSupabaseConfigured ? [] : ['eq-101', 'eq-104']);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(isSupabaseConfigured ? [] : ['eq-101', 'eq-102', 'eq-103']);
  const [notifications, setNotifications] = useState<{ id: string; textAr: string; textEn: string; unread: boolean; time: string }[]>(isSupabaseConfigured ? [] : [
    { id: 'n1', textAr: 'استفسار جديد من م. أحمد محمود بخصوص حفار كاتربيلر 320D2', textEn: 'New inquiry from Eng. Ahmed Mahmoud on CAT 320D2 Excavator', unread: true, time: '10m' },
    { id: 'n2', textAr: 'تم توثيق حسابك كتاجر معتمد في ALEX TRACK بنجاح', textEn: 'Your dealer account is verified on ALEX TRACK', unread: false, time: '2h' },
  ]);

  // --- Search & Advanced Filter State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScopeCategory, setSearchScopeCategory] = useState('all');
  const [selectedGovernorate, setSelectedGovernorate] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterGroup, setFilterGroup] = useState<'all' | 'heavy' | 'agricultural' | 'additional'>('all');
  const [filterListingType, setFilterListingType] = useState<'all' | ListingType>('all');
  const [filterCondition, setFilterCondition] = useState<'all' | ConditionType>('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterYearMin, setFilterYearMin] = useState<string>('');
  const [filterYearMax, setFilterYearMax] = useState<string>('');
  const [filterPriceMin, setFilterPriceMin] = useState<string>('');
  const [filterPriceMax, setFilterPriceMax] = useState<string>('');
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [filterSellerId, setFilterSellerId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'views'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // --- Modals & Drawers State ---
  const [heroSlide, setHeroSlide] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showFavoritesDrawer, setShowFavoritesDrawer] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState<Equipment | null>(null);
  const [showReportModal, setShowReportModal] = useState<Equipment | null>(null);
  const [showEquipmentFormModal, setShowEquipmentFormModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Keep the original interactive sample experience only when no cloud project is configured.
  useEffect(() => {
    if (isSupabaseConfigured) return;
    try {
      localStorage.setItem('alextrack_equipment_v1', JSON.stringify(equipmentList));
      localStorage.setItem('alextrack_users_v1', JSON.stringify(usersList));
    } catch { /* Demo-only storage quota errors are non-fatal. */ }
  }, [equipmentList, usersList]);

  // Load cloud data and restore the real Supabase session.
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const applyCloudData = async (session: any) => {
      setBackendLoading(true);
      try {
        let profile: AppUser | null = null;
        if (session?.user?.id) {
          profile = await marketplaceApi.getProfile(session.user.id);
          if (profile.suspended) {
            await supabase.auth.signOut();
            throw new Error('هذا الحساب موقوف. تواصل مع إدارة ALEX TRACK.');
          }
        }
        const data = await marketplaceApi.loadMarketplace(profile?.id, profile?.role);
        let savedFavorites: string[] = [];
        if (profile) savedFavorites = await marketplaceApi.loadFavorites(profile.id);
        if (!alive) return;
        setCurrentUser(profile);
        setEquipmentList(data.equipment as Equipment[]);
        setCategories(data.categories as Category[]);
        setBanners(data.banners as HeroBanner[]);
        setReviews(data.reviews as ReviewItem[]);
        setUsersList(data.users as AppUser[]);
        setInquiries(data.inquiries as Inquiry[]);
        setReports(data.reports as ReportItem[]);
        setFavorites(savedFavorites);
        setBackendError(null);
      } catch (error: any) {
        if (!alive) return;
        setBackendError(error?.message || 'تعذر تحميل بيانات Supabase');
        setToast({ message: `تعذر الاتصال بقاعدة البيانات: ${error?.message || 'خطأ غير معروف'}`, type: 'warning' });
      } finally {
        if (alive) setBackendLoading(false);
      }
    };
    const start = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await applyCloudData(data.session);
    };
    void start().catch((error: any) => {
      if (alive) {
        setBackendError(error?.message || 'تعذر بدء الاتصال');
        setBackendLoading(false);
        setToast({ message: `تعذر بدء الاتصال: ${error?.message || 'خطأ غير معروف'}`, type: 'warning' });
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        void applyCloudData(session);
      }
    });
    return () => { alive = false; authListener.subscription.unsubscribe(); };
  }, []);

  // Hero Auto-Rotate
  const activeBanners = useMemo(() => banners.filter(b => b.active), [banners]);
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setHeroSlide(prev => (prev + 1) % activeBanners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3600);
  };

  // --- Formatting Helpers ---
  const formatPrice = (egp: number) => {
    if (currency === 'USD') {
      const usd = Math.round(egp / EXCHANGE_RATE_USD);
      return `$${usd.toLocaleString('en-US')}`;
    }
    return lang === 'ar'
      ? `${egp.toLocaleString('en-US')} ج.م`
      : `EGP ${egp.toLocaleString('en-US')}`;
  };

  const getGovName = (id: string) => {
    const found = GOVERNORATES.find(g => g.id === id);
    return found ? (lang === 'ar' ? found.nameAr : found.nameEn) : id;
  };

  const getCatName = (id: string) => {
    const found = categories.find(c => c.id === id);
    return found ? (lang === 'ar' ? found.nameAr : found.nameEn) : id;
  };

  // --- Navigation & Interaction Actions ---
  const openEquipmentDetails = (eq: Equipment) => {
    setEquipmentList(prev => prev.map(item => (item.id === eq.id ? { ...item, views: item.views + 1 } : item)));
    if (isSupabaseConfigured) void marketplaceApi.incrementViews(eq.id).catch((error: any) => {
      setBackendError(error?.message || 'تعذر تحديث عدد المشاهدات');
    });
    setSelectedEquipmentId(eq.id);
    setSelectedImageIdx(0);
    setRecentlyViewedIds(prev => [eq.id, ...prev.filter(id => id !== eq.id)].slice(0, 8));
    setActiveView('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSupabaseConfigured && !currentUser) {
      setAuthMode('login'); setShowAuthModal(true);
      triggerToast(lang === 'ar' ? 'سجل الدخول لحفظ المعدات في المفضلة' : 'Sign in to save favorites', 'info');
      return;
    }
    setFavorites(prev => {
      const exists = prev.includes(id);
      if (isSupabaseConfigured && currentUser) void marketplaceApi.saveFavorite(currentUser.id,id,!exists).catch((error: any) => {
        triggerToast(error?.message || (lang === 'ar' ? 'تعذر تحديث المفضلة' : 'Could not update favorites'),'warning');
      });
      triggerToast(
        exists
          ? (lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites')
          : (lang === 'ar' ? 'تمت الإضافة إلى قائمة المفضلة' : 'Added to favorites'),
        exists ? 'info' : 'success'
      );
      return exists ? prev.filter(item => item !== id) : [...prev, id];
    });
  };

  const toggleCompare = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 4) {
        triggerToast(
          lang === 'ar' ? 'يمكنك مقارنة 4 معدات كحد أقصى في نفس الوقت' : 'You can compare up to 4 machines side-by-side',
          'warning'
        );
        return prev;
      }
      triggerToast(
        lang === 'ar' ? 'تمت إضافة المعدة للمقارنة' : 'Added to side-by-side comparison',
        'success'
      );
      return [...prev, id];
    });
  };

  const applyPresetFilter = (preset: {
    group?: 'all' | 'heavy' | 'agricultural' | 'additional';
    categoryId?: string;
    listingType?: 'all' | ListingType;
    condition?: 'all' | ConditionType;
    sellerId?: string;
  }) => {
    setFilterGroup(preset.group || 'all');
    setFilterCategory(preset.categoryId || 'all');
    setFilterListingType(preset.listingType || 'all');
    setFilterCondition(preset.condition || 'all');
    setFilterSellerId(preset.sellerId || 'all');
    setCurrentPage(1);
    setActiveView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSearchScopeCategory('all');
    setSelectedGovernorate('all');
    setFilterCategory('all');
    setFilterGroup('all');
    setFilterListingType('all');
    setFilterCondition('all');
    setFilterBrand('all');
    setFilterYearMin('');
    setFilterYearMax('');
    setFilterPriceMin('');
    setFilterPriceMax('');
    setFilterVerifiedOnly(false);
    setFilterSellerId('all');
    setCurrentPage(1);
  };

  // --- Filtered & Sorted Equipment for Catalog ---
  const publicEquipment = useMemo(
    () => equipmentList.filter(eq => eq.status === 'active' || eq.status === 'sold' || eq.status === 'rented'),
    [equipmentList]
  );

  const filteredEquipment = useMemo(() => {
    return publicEquipment
      .filter(eq => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchText =
            eq.titleAr.toLowerCase().includes(q) ||
            eq.titleEn.toLowerCase().includes(q) ||
            eq.brand.toLowerCase().includes(q) ||
            eq.model.toLowerCase().includes(q) ||
            eq.stockCode.toLowerCase().includes(q);
          if (!matchText) return false;
        }
        // Governorate
        if (selectedGovernorate !== 'all' && eq.governorateId !== selectedGovernorate) return false;
        // Group
        if (filterGroup !== 'all') {
          const cat = categories.find(c => c.id === eq.categoryId);
          if (cat?.group !== filterGroup) return false;
        }
        // Category
        const activeCat = filterCategory !== 'all' ? filterCategory : searchScopeCategory;
        if (activeCat !== 'all') {
          if (activeCat === 'used-equipment' && eq.condition !== 'used') return false;
          else if (activeCat === 'new-equipment' && eq.condition !== 'new') return false;
          else if (activeCat !== 'used-equipment' && activeCat !== 'new-equipment' && eq.categoryId !== activeCat) return false;
        }
        // Listing Type
        if (filterListingType !== 'all' && eq.listingType !== filterListingType) return false;
        // Condition
        if (filterCondition !== 'all' && eq.condition !== filterCondition) return false;
        // Brand
        if (filterBrand !== 'all' && eq.brand !== filterBrand) return false;
        // Year Range
        if (filterYearMin && eq.year < Number(filterYearMin)) return false;
        if (filterYearMax && eq.year > Number(filterYearMax)) return false;
        // Price Range
        if (filterPriceMin && eq.priceEgp < Number(filterPriceMin)) return false;
        if (filterPriceMax && eq.priceEgp > Number(filterPriceMax)) return false;
        // Verified Only
        if (filterVerifiedOnly && !eq.sellerVerified) return false;
        // Specific Seller
        if (filterSellerId !== 'all' && eq.sellerId !== filterSellerId) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.priceEgp - b.priceEgp;
        if (sortBy === 'price-desc') return b.priceEgp - a.priceEgp;
        if (sortBy === 'views') return b.views - a.views;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [
    publicEquipment, searchQuery, selectedGovernorate, filterGroup, filterCategory,
    searchScopeCategory, filterListingType, filterCondition, filterBrand,
    filterYearMin, filterYearMax, filterPriceMin, filterPriceMax,
    filterVerifiedOnly, filterSellerId, sortBy, categories
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredEquipment.length / ITEMS_PER_PAGE));
  const paginatedEquipment = filteredEquipment.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const selectedEquipment = useMemo(
    () => equipmentList.find(e => e.id === selectedEquipmentId) || null,
    [equipmentList, selectedEquipmentId]
  );

  // ==========================================================================
  // 6. REUSABLE EQUIPMENT CARD COMPONENT
  // ==========================================================================
  const EquipmentCard: React.FC<{ eq: Equipment }> = ({ eq }) => {
    const isFav = favorites.includes(eq.id);
    const isComp = compareIds.includes(eq.id);
    const hasDiscount = eq.originalPriceEgp && eq.originalPriceEgp > eq.priceEgp;
    const discountPct = hasDiscount
      ? Math.round(((eq.originalPriceEgp! - eq.priceEgp) / eq.originalPriceEgp!) * 100)
      : 0;

    return (
      <div
        onClick={() => openEquipmentDetails(eq)}
        className="group bg-white rounded-2xl border border-slate-200/90 hover:border-[#F97316] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative"
      >
        {/* Top Badges Overlay */}
        <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
          <img
            src={eq.images[0] || IMG.excavator1}
            alt={lang === 'ar' ? eq.titleAr : eq.titleEn}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C]/80 via-transparent to-black/25" />

          {/* Status Stamp if Sold or Rented */}
          {(eq.status === 'sold' || eq.status === 'rented') && (
            <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center z-10">
              <span className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-black text-sm tracking-wider uppercase border-2 border-white shadow-lg">
                {eq.status === 'sold'
                  ? (lang === 'ar' ? 'تم البيع' : 'SOLD')
                  : (lang === 'ar' ? 'تم التأجير' : 'RENTED')}
              </span>
            </div>
          )}

          {/* Top Left/Right Pills */}
          <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 z-10">
            <div className="flex flex-wrap gap-1.5">
              {eq.isFeatured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-[11px] font-bold shadow">
                  <Sparkles className="w-3 h-3" />
                  {lang === 'ar' ? 'إعلان مميز' : 'Featured'}
                </span>
              )}
              <span
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold shadow ${
                  eq.listingType === 'sale'
                    ? 'bg-[#0B192C] text-white border border-slate-700'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {eq.listingType === 'sale'
                  ? (lang === 'ar' ? 'للبيع' : 'For Sale')
                  : (lang === 'ar' ? 'للإيجار' : 'For Rent')}
              </span>
              <span
                className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                  eq.condition === 'new'
                    ? 'bg-sky-500 text-white'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {eq.condition === 'new'
                  ? (lang === 'ar' ? 'جديد' : 'New')
                  : (lang === 'ar' ? 'مستعمل' : 'Used')}
              </span>
            </div>

            {/* Action Icons (Favorite + Compare) */}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={e => toggleFavorite(eq.id, e)}
                title={lang === 'ar' ? 'أضف للمفضلة' : 'Favorite'}
                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition ${
                  isFav
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-white/90 text-slate-700 hover:bg-white hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={e => toggleCompare(eq.id, e)}
                title={lang === 'ar' ? 'قارن المعدة' : 'Compare'}
                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition ${
                  isComp
                    ? 'bg-[#F97316] text-white shadow-md'
                    : 'bg-white/90 text-slate-700 hover:bg-white hover:text-[#F97316]'
                }`}
              >
                <Scale className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Image Meta */}
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-white text-xs">
            <span className="inline-flex items-center gap-1 bg-black/55 backdrop-blur-sm px-2 py-0.5 rounded font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
              {getGovName(eq.governorateId)}
            </span>
            {hasDiscount && (
              <span className="bg-red-600 text-white font-extrabold px-2 py-0.5 rounded text-[11px]">
                -{discountPct}%
              </span>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Brand & Year Tag */}
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-bold text-[#0B192C] uppercase tracking-wider">
                {eq.brand} • {eq.model}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                {eq.year}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 group-hover:text-[#F97316] transition-colors leading-snug mb-2.5">
              {lang === 'ar' ? eq.titleAr : eq.titleEn}
            </h3>

            {/* Quick Technical Specs Strip */}
            <div className="grid grid-cols-2 gap-2 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-3">
              <div className="flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span className="truncate">
                  {eq.operatingHours.toLocaleString()} {lang === 'ar' ? 'ساعة' : 'hrs'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-[#0B192C] shrink-0" />
                <span className="truncate">{getCatName(eq.categoryId)}</span>
              </div>
            </div>
          </div>

          {/* Price & Seller Footer */}
          <div>
            <div className="mb-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-lg sm:text-xl font-black text-[#0B192C]">
                  {formatPrice(eq.priceEgp)}
                </span>
                {eq.listingType === 'rent' && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    / {eq.rentPeriod === 'day' ? (lang === 'ar' ? 'يوم' : 'day') : (lang === 'ar' ? 'شهر' : 'month')}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <div className="text-xs text-slate-400 line-through">
                  {formatPrice(eq.originalPriceEgp!)}
                </div>
              )}
            </div>

            {/* Seller Row */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs mb-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate font-semibold text-slate-700">
                  {lang === 'ar' ? eq.sellerNameAr : eq.sellerNameEn}
                </span>
                {eq.sellerVerified && (
                  <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" title={lang === 'ar' ? 'تاجر معتمد' : 'Verified Dealer'} />
                )}
              </div>
              <div className="flex items-center gap-0.5 text-amber-500 font-bold shrink-0">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{eq.sellerRating.toFixed(1)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  openEquipmentDetails(eq);
                }}
                className="col-span-3 py-2 px-3 rounded-xl bg-[#0B192C] hover:bg-[#132844] text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'التفاصيل' : 'Details'}
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setShowInquiryModal(eq);
                }}
                className="col-span-2 py-2 px-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'تواصل' : 'Contact'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 7. HEADER & MEGA-NAVIGATION BAR
  // ==========================================================================
  const unreadInquiriesCount = inquiries.filter(i => !i.read).length;
  const pendingListingsCount = equipmentList.filter(e => e.status === 'pending').length;

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col selection:bg-[#F97316] selection:text-white"
      style={{ fontFamily: lang === 'ar' ? "'Cairo', 'Tajawal', sans-serif" : "'Inter', system-ui, sans-serif" }}
    >
      {/* Google Fonts Injection for Cairo & Inter */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {isSupabaseConfigured ? (
        <div className={`px-4 py-1.5 text-[11px] text-center font-bold ${backendError ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}>
          {backendLoading ? (lang === 'ar' ? 'جارٍ الاتصال بقاعدة البيانات...' : 'Connecting to database...') : backendError ? (lang === 'ar' ? `مشكلة في الاتصال: ${backendError}` : `Connection issue: ${backendError}`) : (lang === 'ar' ? 'متصل بقاعدة بيانات ALEX TRACK' : 'Connected to ALEX TRACK database')}
        </div>
      ) : (
        <div className="px-4 py-1.5 text-[11px] text-center font-bold bg-amber-100 text-amber-900">
          {lang === 'ar' ? 'وضع عرض تجريبي — البيانات محلية ولن تُنشر أو تُزامن حتى إعداد Supabase' : 'Demo mode — local sample data only; configure Supabase for live accounts and sync'}
        </div>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:end-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-bold text-white ${
              toast.type === 'success'
                ? 'bg-emerald-600 border-emerald-400'
                : toast.type === 'warning'
                ? 'bg-amber-600 border-amber-400'
                : 'bg-[#0B192C] border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* TOP UTILITY & DEMO ROLE SWITCHER BAR */}
      <div className="bg-[#07111F] text-slate-300 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
              {lang === 'ar'
                ? 'سوق المعدات الثقيلة والزراعية المعتمد في جمهورية مصر العربية'
                : 'Certified Heavy Equipment & Agricultural Machinery Marketplace in Egypt'}
            </span>
            <button
              type="button"
              onClick={() => setShowSupabaseModal(true)}
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold underline decoration-dotted"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'هيكل قاعدة بيانات Supabase & RLS' : 'Supabase SQL & RLS Schema'}
            </button>
          </div>

          {/* Interactive Role Switcher + Language + Currency */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Quick Role Switcher for Testing All Dashboards */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-0.5">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                {lang === 'ar' ? 'وضع الحساب:' : 'Demo Role:'}
              </span>
              <select
                value={currentUser ? currentUser.role : 'guest'}
                onChange={e => {
                  const val = e.target.value as UserRole;
                  if (val === 'guest') {
                    setCurrentUser(null);
                    setActiveView('home');
                  } else {
                    const matched = usersList.find(u => u.role === val) || INITIAL_USERS[0];
                    setCurrentUser(matched);
                    if (val === 'admin') setActiveView('admin-dashboard');
                    else if (val === 'seller') setActiveView('seller-dashboard');
                  }
                }}
                className="bg-transparent text-white font-bold text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="seller" className="bg-[#0B192C]">
                  {lang === 'ar' ? 'تاجر / بائع معتمد' : 'Verified Seller'}
                </option>
                <option value="buyer" className="bg-[#0B192C]">
                  {lang === 'ar' ? 'مشتري / مقاول' : 'Buyer / Contractor'}
                </option>
                <option value="admin" className="bg-[#0B192C]">
                  {lang === 'ar' ? 'مدير المنصة (Admin)' : 'Super Admin'}
                </option>
                <option value="guest" className="bg-[#0B192C]">
                  {lang === 'ar' ? 'زائر (غير مسجل)' : 'Guest Visitor'}
                </option>
              </select>
            </div>

            {/* Currency Toggle */}
            <button
              type="button"
              onClick={() => setCurrency(prev => (prev === 'EGP' ? 'USD' : 'EGP'))}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
            >
              {currency === 'EGP' ? '🇪🇬 EGP (ج.م)' : '🇺🇸 USD ($)'}
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLang(prev => (prev === 'ar' ? 'en' : 'ar'))}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#F97316] hover:bg-[#EA580C] text-white font-bold transition"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN STICKY AMAZON/NOON STYLE INDUSTRIAL HEADER */}
      <header className="sticky top-0 z-40 bg-[#0B192C] text-white shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
          {/* Logo */}
          <button
            type="button"
            onClick={() => {
              resetAllFilters();
              setActiveView('home');
            }}
            className="text-start focus:outline-none"
          >
            <AlexTrackLogo lang={lang} />
          </button>

          {/* Governorate Location Selector */}
          <div className="hidden xl:flex items-center gap-2 bg-[#132844] hover:bg-[#1a3558] px-3 py-2 rounded-xl border border-slate-700/80 transition">
            <MapPin className="w-4 h-4 text-[#F97316] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 leading-none">
                {lang === 'ar' ? 'الموقع / المحافظة' : 'Location'}
              </span>
              <select
                value={selectedGovernorate}
                onChange={e => {
                  setSelectedGovernorate(e.target.value);
                  if (activeView === 'home') setActiveView('catalog');
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer mt-0.5"
              >
                {GOVERNORATES.map(g => (
                  <option key={g.id} value={g.id} className="bg-[#0B192C] text-white">
                    {lang === 'ar' ? g.nameAr : g.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wide Marketplace Search Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              setActiveView('catalog');
            }}
            className="order-3 lg:order-2 w-full lg:flex-1 flex items-stretch bg-white rounded-xl overflow-hidden shadow-inner border-2 border-transparent focus-within:border-[#F97316]"
          >
            <select
              value={searchScopeCategory}
              onChange={e => setSearchScopeCategory(e.target.value)}
              className="hidden sm:block bg-slate-100 text-slate-700 text-xs font-bold px-3 border-e border-slate-200 focus:outline-none max-w-[155px] truncate"
            >
              <option value="all">{lang === 'ar' ? 'جميع الأقسام' : 'All Categories'}</option>
              <optgroup label={lang === 'ar' ? 'المعدات الثقيلة' : 'Heavy Equipment'}>
                {categories.filter(c => c.group === 'heavy').map(c => (
                  <option key={c.id} value={c.id}>{lang === 'ar' ? c.nameAr : c.nameEn}</option>
                ))}
              </optgroup>
              <optgroup label={lang === 'ar' ? 'المعدات الزراعية' : 'Agricultural'}>
                {categories.filter(c => c.group === 'agricultural').map(c => (
                  <option key={c.id} value={c.id}>{lang === 'ar' ? c.nameAr : c.nameEn}</option>
                ))}
              </optgroup>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'ابحث عن حفار، جرار، لودر، كاتربيلر، جون دير، أو رقم الموديل...'
                  : 'Search excavators, tractors, CAT 320D, John Deere, model...'
              }
              className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="px-5 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-sm flex items-center gap-1.5 transition"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'بحث' : 'Search'}</span>
            </button>
          </form>

          {/* Right Action Icons & CTA */}
          <div className="order-2 lg:order-3 flex items-center gap-1.5 sm:gap-2.5">
            {/* Compare Button */}
            <button
              type="button"
              onClick={() => setShowCompareModal(true)}
              className="relative p-2.5 rounded-xl bg-[#132844] hover:bg-[#1c385e] text-slate-200 transition"
              title={lang === 'ar' ? 'مقارنة المعدات' : 'Compare Equipment'}
            >
              <Scale className="w-5 h-5" />
              {compareIds.length > 0 && (
                <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-[#F97316] text-white text-[11px] font-black flex items-center justify-center">
                  {compareIds.length}
                </span>
              )}
            </button>

            {/* Favorites Button */}
            <button
              type="button"
              onClick={() => setShowFavoritesDrawer(true)}
              className="relative p-2.5 rounded-xl bg-[#132844] hover:bg-[#1c385e] text-slate-200 transition"
              title={lang === 'ar' ? 'المفضلة' : 'Favorites'}
            >
              <Heart className="w-5 h-5" />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationsMenu(prev => !prev)}
                className="relative p-2.5 rounded-xl bg-[#132844] hover:bg-[#1c385e] text-slate-200 transition"
                title={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-2 end-2 w-2.5 h-2.5 rounded-full bg-[#F97316] ring-2 ring-[#0B192C]" />
                )}
              </button>

              {showNotificationsMenu && (
                <div className="absolute end-0 mt-2 w-80 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 bg-[#0B192C] text-white flex items-center justify-between">
                    <span className="font-bold text-sm">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
                    <button
                      type="button"
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                      className="text-xs text-[#F97316] hover:underline"
                    >
                      {lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-3 text-xs ${n.unread ? 'bg-orange-50/70' : ''}`}>
                        <p className="font-semibold text-slate-800">{lang === 'ar' ? n.textAr : n.textEn}</p>
                        <span className="text-[11px] text-slate-400 mt-1 block">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Account / Dashboard Shortcut */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  if (currentUser.role === 'admin') setActiveView('admin-dashboard');
                  else if (currentUser.role === 'seller') setActiveView('seller-dashboard');
                  else setActiveView('profile');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#132844] hover:bg-[#1c385e] border border-slate-700 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-[#F97316] text-white font-black text-xs flex items-center justify-center">
                  {currentUser.nameEn.charAt(0)}
                </div>
                <div className="hidden md:flex flex-col text-start leading-tight">
                  <span className="text-[10px] text-slate-400">
                    {currentUser.role === 'admin'
                      ? (lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel')
                      : currentUser.role === 'seller'
                      ? (lang === 'ar' ? 'لوحة التاجر' : 'Seller Hub')
                      : (lang === 'ar' ? 'حسابي' : 'My Account')}
                  </span>
                  <span className="text-xs font-bold max-w-[110px] truncate">
                    {lang === 'ar' ? currentUser.nameAr : currentUser.nameEn}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#132844] hover:bg-[#1c385e] text-xs font-bold border border-slate-700 transition"
              >
                <User className="w-4 h-4 text-[#F97316]" />
                <span>{lang === 'ar' ? 'دخول / تسجيل' : 'Sign In'}</span>
              </button>
            )}

            {/* Post Equipment CTA */}
            <button
              type="button"
              onClick={() => {
                if (!currentUser || (isSupabaseConfigured && currentUser.role !== 'seller')) {
                  setAuthMode(currentUser ? 'login' : 'register');
                  setShowAuthModal(true);
                  triggerToast(lang === 'ar' ? 'تحتاج إلى حساب بائع لإضافة معداتك' : 'A seller account is required to post equipment', 'info');
                  return;
                }
                setEditingEquipment(null);
                setShowEquipmentFormModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-orange-500/25 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'أضف معدتك' : 'Post Equipment'}</span>
            </button>
          </div>
        </div>

        {/* SUB-NAVIGATION CATEGORY BAR */}
        <nav className="bg-[#132844] border-t border-slate-700/70">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                resetAllFilters();
                setActiveView('home');
              }}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition ${
                activeView === 'home' ? 'bg-[#F97316] text-white' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {lang === 'ar' ? 'الرئيسية' : 'Home'}
            </button>

            <button
              type="button"
              onClick={() => applyPresetFilter({})}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition ${
                activeView === 'catalog' && filterGroup === 'all' && filterListingType === 'all'
                  ? 'bg-[#F97316] text-white'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {lang === 'ar' ? `جميع المعدات (${publicEquipment.length})` : `All Equipment (${publicEquipment.length})`}
            </button>

            <button
              type="button"
              onClick={() => applyPresetFilter({ group: 'heavy' })}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition ${
                activeView === 'catalog' && filterGroup === 'heavy'
                  ? 'bg-[#F97316] text-white'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {lang === 'ar' ? 'المعدات الثقيلة (10)' : 'Heavy Equipment (10)'}
            </button>

            <button
              type="button"
              onClick={() => applyPresetFilter({ group: 'agricultural' })}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition ${
                activeView === 'catalog' && filterGroup === 'agricultural'
                  ? 'bg-[#F97316] text-white'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {lang === 'ar' ? 'المعدات الزراعية (9)' : 'Agricultural Equipment (9)'}
            </button>

            <button
              type="button"
              onClick={() => applyPresetFilter({ listingType: 'rent' })}
              className={`px-3 py-1.5 rounded-lg shrink-0 transition ${
                activeView === 'catalog' && filterListingType === 'rent'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-300 hover:bg-white/10'
              }`}
            >
              {lang === 'ar' ? 'معدات للإيجار' : 'Equipment for Rent'}
            </button>

            <button
              type="button"
              onClick={() => applyPresetFilter({ categoryId: 'spare-parts' })}
              className="px-3 py-1.5 rounded-lg shrink-0 text-slate-200 hover:bg-white/10 transition"
            >
              {lang === 'ar' ? 'قطع الغيار والملحقات' : 'Spare Parts & Accessories'}
            </button>

            <button
              type="button"
              onClick={() => applyPresetFilter({ condition: 'used' })}
              className="px-3 py-1.5 rounded-lg shrink-0 text-slate-200 hover:bg-white/10 transition"
            >
              {lang === 'ar' ? 'معدات مستعملة' : 'Used Equipment'}
            </button>

            <button
              type="button"
              onClick={() => applyPresetFilter({ condition: 'new' })}
              className="px-3 py-1.5 rounded-lg shrink-0 text-slate-200 hover:bg-white/10 transition"
            >
              {lang === 'ar' ? 'معدات جديدة زيرو' : 'New Equipment'}
            </button>

            {/* Quick Dashboard Links */}
            <div className="ms-auto flex items-center gap-1.5 shrink-0">
              {currentUser?.role === 'seller' && (
                <button
                  type="button"
                  onClick={() => setActiveView('seller-dashboard')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    activeView === 'seller-dashboard'
                      ? 'bg-[#F97316] text-white'
                      : 'bg-white/10 text-orange-300 hover:bg-white/20'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'لوحة تحكم البائع' : 'Seller Dashboard'}
                  {unreadInquiriesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
                      {unreadInquiriesCount}
                    </span>
                  )}
                </button>
              )}

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setActiveView('admin-dashboard')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    activeView === 'admin-dashboard'
                      ? 'bg-[#F97316] text-white'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'لوحة الإدارة (Admin)' : 'Admin Dashboard'}
                  {pendingListingsCount > 0 && (
                    <span className="px-1.5 rounded-full bg-[#F97316] text-white text-[10px]">
                      {pendingListingsCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* ==================================================================== */}
      {/* 8. MAIN PAGE CONTENT ROUTER                                          */}
      {/* ==================================================================== */}
      <main className="flex-1">
        {/* ------------------------------------------------------------------ */}
        {/* VIEW 1: HOMEPAGE                                                   */}
        {/* ------------------------------------------------------------------ */}
        {activeView === 'home' && (
          <div className="space-y-10 pb-14">
            {/* HERO BANNER CAROUSEL */}
            {activeBanners.length > 0 && (
              <section className="relative bg-[#0B192C] overflow-hidden">
                {(() => {
                  const banner = activeBanners[heroSlide % activeBanners.length];
                  return (
                    <div className="relative min-h-[420px] sm:min-h-[470px] flex items-center">
                      <img
                        src={banner.image}
                        alt={lang === 'ar' ? banner.titleAr : banner.titleEn}
                        className="absolute inset-0 w-full h-full object-cover opacity-35 transition-all duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0B192C] via-[#0B192C]/85 to-[#0B192C]/45" />

                      <div className="relative max-w-7xl mx-auto px-4 py-12 w-full grid lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-8 space-y-5 text-white">
                          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F97316]/20 border border-[#F97316]/50 text-[#F97316] text-xs font-extrabold tracking-wide">
                            <Sparkles className="w-3.5 h-3.5" />
                            {lang === 'ar' ? banner.badgeAr : banner.badgeEn}
                          </span>

                          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
                            {lang === 'ar' ? banner.titleAr : banner.titleEn}
                          </h1>

                          <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                            {lang === 'ar' ? banner.subtitleAr : banner.subtitleEn}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => applyPresetFilter(banner.filterPreset)}
                              className="px-6 py-3.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold text-sm shadow-xl shadow-orange-500/30 transition flex items-center gap-2"
                            >
                              <span>{lang === 'ar' ? banner.ctaAr : banner.ctaEn}</span>
                              {lang === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingEquipment(null);
                                setShowEquipmentFormModal(true);
                              }}
                              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-sm border border-white/25 transition"
                            >
                              {lang === 'ar' ? '+ اعرض معدتك للبيع أو الإيجار' : '+ List Your Equipment'}
                            </button>
                          </div>

                          {/* Hero KPIs */}
                          <div className="grid grid-cols-3 gap-4 pt-4 max-w-lg border-t border-white/15">
                            <div>
                              <div className="text-xl sm:text-2xl font-black text-[#F97316]">+2,450</div>
                              <div className="text-xs text-slate-300">{lang === 'ar' ? 'معدة وجرار متاح' : 'Active Machines'}</div>
                            </div>
                            <div>
                              <div className="text-xl sm:text-2xl font-black text-white">27</div>
                              <div className="text-xs text-slate-300">{lang === 'ar' ? 'محافظة في مصر' : 'Egyptian Governorates'}</div>
                            </div>
                            <div>
                              <div className="text-xl sm:text-2xl font-black text-emerald-400">100%</div>
                              <div className="text-xs text-slate-300">{lang === 'ar' ? 'تجار موثقون' : 'Verified Dealers'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Industrial Finder Box */}
                        <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-2xl border border-slate-200">
                          <h2 className="font-black text-[#0B192C] text-base mb-3 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-[#F97316]" />
                            {lang === 'ar' ? 'البحث السريع عن المعدات' : 'Quick Machinery Finder'}
                          </h2>
                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">
                                {lang === 'ar' ? 'نوع العملية' : 'Transaction Type'}
                              </label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {(['all', 'sale', 'rent'] as const).map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => setFilterListingType(t)}
                                    className={`py-2 rounded-lg font-bold border transition ${
                                      filterListingType === t
                                        ? 'bg-[#0B192C] text-white border-[#0B192C]'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {t === 'all'
                                      ? (lang === 'ar' ? 'الكل' : 'All')
                                      : t === 'sale'
                                      ? (lang === 'ar' ? 'شراء' : 'Buy')
                                      : (lang === 'ar' ? 'إيجار' : 'Rent')}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">
                                {lang === 'ar' ? 'الفئة / القسم' : 'Equipment Category'}
                              </label>
                              <select
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
                              >
                                <option value="all">{lang === 'ar' ? 'جميع الفئات' : 'All Categories'}</option>
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {lang === 'ar' ? c.nameAr : c.nameEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">
                                {lang === 'ar' ? 'الماركة المصنعة' : 'Manufacturer / Brand'}
                              </label>
                              <select
                                value={filterBrand}
                                onChange={e => setFilterBrand(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
                              >
                                <option value="all">{lang === 'ar' ? 'كل الماركات العالمية' : 'All Brands'}</option>
                                {BRANDS.map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveView('catalog')}
                              className="w-full py-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
                            >
                              <Search className="w-4 h-4" />
                              {lang === 'ar' ? 'عرض النتائج المطابقة' : 'Show Matching Machines'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Carousel Dots */}
                      <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
                        {activeBanners.map((b, idx) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setHeroSlide(idx)}
                            className={`h-2 rounded-full transition-all ${
                              heroSlide % activeBanners.length === idx ? 'w-8 bg-[#F97316]' : 'w-2 bg-white/40'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* CATEGORY SHOWCASE: HEAVY EQUIPMENT (10 CATEGORIES) */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0B192C]">
                    {lang === 'ar' ? 'أقسام المعدات الثقيلة والإنشاءات' : 'Heavy Equipment Categories'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {lang === 'ar' ? 'اختر نوع المعدة لتصفح العروض المتاحة للبيع والإيجار' : 'Select machinery type to browse available sales & rentals'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyPresetFilter({ group: 'heavy' })}
                  className="text-xs sm:text-sm font-bold text-[#F97316] hover:underline flex items-center gap-1"
                >
                  {lang === 'ar' ? 'عرض الكل' : 'View All'}
                  {lang === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {categories.filter(c => c.group === 'heavy' && c.active).map(cat => {
                  const count = publicEquipment.filter(e => e.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => applyPresetFilter({ categoryId: cat.id })}
                      className="group bg-white hover:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 hover:border-[#0B192C] shadow-sm transition-all flex flex-col items-center text-center gap-2.5"
                    >
                      <div className="w-12 h-12 rounded-xl bg-orange-50 group-hover:bg-[#F97316] text-[#F97316] group-hover:text-white flex items-center justify-center transition">
                        <CategoryVectorIcon iconKey={cat.iconKey} />
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-white">
                          {lang === 'ar' ? cat.nameAr : cat.nameEn}
                        </div>
                        <div className="text-[11px] text-slate-400 group-hover:text-slate-300 mt-0.5">
                          {count} {lang === 'ar' ? 'إعلان' : 'listings'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* FEATURED PAID ADVERTISEMENTS */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="bg-gradient-to-r from-[#0B192C] to-[#132844] rounded-3xl p-5 sm:p-7 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F97316] text-white flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-2xl font-black text-white">
                        {lang === 'ar' ? 'المعدات المميزة وإعلانات كبار الوكلاء' : 'Featured Machinery & Dealer Spotlights'}
                      </h2>
                      <p className="text-xs text-slate-300">
                        {lang === 'ar' ? 'معدات مفحوصة ومعتمدة بأولوية الظهور على ALEX TRACK' : 'Verified priority listings across Egypt'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPresetFilter({})}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                  >
                    {lang === 'ar' ? 'تصفح كل الإعلانات' : 'Browse All Listings'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {publicEquipment.filter(e => e.isFeatured).slice(0, 4).map(eq => (
                    <EquipmentCard key={eq.id} eq={eq} />
                  ))}
                </div>
              </div>
            </section>

            {/* CATEGORY SHOWCASE: AGRICULTURAL EQUIPMENT (9 CATEGORIES) + ADDITIONAL (5) */}
            <section className="max-w-7xl mx-auto px-4 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0B192C]">
                      {lang === 'ar' ? 'أقسام المعدات الزراعية وأنظمة الري' : 'Agricultural Equipment & Irrigation'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {lang === 'ar' ? 'جرارات، حصادات، رشاشات، محاريث وطلمبات زراعية لجميع المساحات' : 'Tractors, harvesters, sprayers, plows & irrigation systems'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyPresetFilter({ group: 'agricultural' })}
                    className="text-xs sm:text-sm font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    {lang === 'ar' ? 'عرض الكل' : 'View All'}
                    {lang === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {categories.filter(c => c.group === 'agricultural' && c.active).map(cat => {
                    const count = publicEquipment.filter(e => e.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => applyPresetFilter({ categoryId: cat.id })}
                        className="group bg-white hover:bg-emerald-900 p-4 rounded-2xl border border-slate-200 hover:border-emerald-900 shadow-sm transition-all flex flex-col items-center text-center gap-2.5"
                      >
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-500 text-emerald-700 group-hover:text-white flex items-center justify-center transition">
                          <CategoryVectorIcon iconKey={cat.iconKey} />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-white">
                            {lang === 'ar' ? cat.nameAr : cat.nameEn}
                          </div>
                          <div className="text-[11px] text-slate-400 group-hover:text-emerald-200 mt-0.5">
                            {count} {lang === 'ar' ? 'إعلان' : 'listings'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Additional 5 Categories Pills */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase">
                  {lang === 'ar' ? 'تصنيفات إضافية:' : 'Quick Shortcuts:'}
                </span>
                {categories.filter(c => c.group === 'additional').map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => applyPresetFilter({ categoryId: cat.id })}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#0B192C] text-slate-800 hover:text-white border border-slate-200 text-xs font-bold shadow-sm transition"
                  >
                    {lang === 'ar' ? cat.nameAr : cat.nameEn}
                  </button>
                ))}
              </div>
            </section>

            {/* SPECIAL OFFERS & DISCOUNTS */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                    <Tag className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0B192C]">
                      {lang === 'ar' ? 'عروض وتخفيضات حصرية' : 'Special Offers & Price Drops'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {lang === 'ar' ? 'وفّر حتى 350,000 ج.م على المعدات المختارة لفترة محدودة' : 'Limited-time dealer discounts on top machinery'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => applyPresetFilter({})}
                  className="text-xs sm:text-sm font-bold text-[#F97316] hover:underline"
                >
                  {lang === 'ar' ? 'المزيد من العروض' : 'See More Deals'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {publicEquipment.filter(e => e.originalPriceEgp).slice(0, 4).map(eq => (
                  <EquipmentCard key={eq.id} eq={eq} />
                ))}
              </div>
            </section>

            {/* BEST-SELLING & NEW ARRIVALS */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-[#0B192C] text-[#F97316] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0B192C]">
                      {lang === 'ar' ? 'الأكثر طلباً وأحدث الإضافات' : 'Best-Selling & New Arrivals'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {lang === 'ar' ? 'أحدث المعدات المضافة يومياً في أسواق القاهرة والإسكندرية والدلتا' : 'Latest listings added across Cairo, Alexandria & the Delta'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => applyPresetFilter({})}
                  className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#132844] transition"
                >
                  {lang === 'ar' ? 'عرض الكتالوج الكامل' : 'Full Catalog'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {publicEquipment.slice(4, 12).map(eq => (
                  <EquipmentCard key={eq.id} eq={eq} />
                ))}
              </div>
            </section>

            {/* TRUSTED VERIFIED SELLERS SHOWCASE */}
            <section className="max-w-7xl mx-auto px-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-xl font-black text-[#0B192C] flex items-center gap-2">
                      <BadgeCheck className="w-6 h-6 text-sky-500" />
                      {lang === 'ar' ? 'تجار ووكلاء معتمدون على ALEX TRACK' : 'Trusted Verified Dealers on ALEX TRACK'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === 'ar' ? 'شركات ومعارض تم التحقق من سجلاتها التجارية ومقراتها الفعلية' : 'Verified commercial registries and physical machinery yards'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {usersList.filter(u => u.role === 'seller' && u.verified).map(seller => {
                    const sellerStock = publicEquipment.filter(e => e.sellerId === seller.id).length;
                    return (
                      <div
                        key={seller.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-[#0B192C] text-white font-black text-lg flex items-center justify-center shrink-0">
                            {seller.nameEn.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <h3 className="font-bold text-sm text-slate-900 truncate">
                                {lang === 'ar' ? seller.nameAr : seller.nameEn}
                              </h3>
                              <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{getGovName(seller.governorateId)}</span>
                              <span>•</span>
                              <span className="text-amber-600 font-bold">★ {seller.rating.toFixed(1)}</span>
                              <span>•</span>
                              <span>{sellerStock} {lang === 'ar' ? 'معدة' : 'units'}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => applyPresetFilter({ sellerId: seller.id })}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-[#F97316] text-[#0B192C] hover:text-white border border-slate-300 hover:border-[#F97316] text-xs font-bold shrink-0 transition"
                        >
                          {lang === 'ar' ? 'المعرض' : 'Showroom'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* RECENTLY VIEWED EQUIPMENT */}
            {recentlyViewedIds.length > 0 && (
              <section className="max-w-7xl mx-auto px-4">
                <h2 className="text-lg font-black text-[#0B192C] mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#F97316]" />
                  {lang === 'ar' ? 'معدات شاهدتها مؤخراً' : 'Recently Viewed Equipment'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recentlyViewedIds
                    .map(id => publicEquipment.find(e => e.id === id))
                    .filter((e): e is Equipment => Boolean(e))
                    .slice(0, 4)
                    .map(eq => (
                      <EquipmentCard key={eq.id} eq={eq} />
                    ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 2: ADVANCED CATALOG & SEARCH FILTERS                          */}
        {/* ------------------------------------------------------------------ */}
        {activeView === 'catalog' && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Breadcrumb & Mobile Filter Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <button type="button" onClick={() => setActiveView('home')} className="hover:text-[#F97316]">
                    {lang === 'ar' ? 'الرئيسية' : 'Home'}
                  </button>
                  <span>/</span>
                  <span className="font-bold text-slate-800">
                    {lang === 'ar' ? 'سوق المعدات والآلات' : 'Equipment Marketplace'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">
                  {lang === 'ar'
                    ? `نتائج البحث (${filteredEquipment.length} معدة متاحة)`
                    : `Marketplace Results (${filteredEquipment.length} machines)`}
                </h1>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(prev => !prev)}
                  className="lg:hidden px-3.5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-4 h-4 text-[#F97316]" />
                  {lang === 'ar' ? 'تصفية متقدمة' : 'Filters'}
                </button>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-300 text-xs">
                  <ArrowUpDown className="w-4 h-4 text-[#F97316]" />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="newest">{lang === 'ar' ? 'الأحدث إضافة' : 'Newest Listings'}</option>
                    <option value="price-asc">{lang === 'ar' ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
                    <option value="price-desc">{lang === 'ar' ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
                    <option value="views">{lang === 'ar' ? 'الأكثر مشاهدة' : 'Most Viewed'}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* FILTER SIDEBAR */}
              <aside
                className={`${
                  mobileFilterOpen ? 'block' : 'hidden'
                } lg:block lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="font-black text-sm text-[#0B192C] flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#F97316]" />
                    {lang === 'ar' ? 'فلاتر البحث الدقيقة' : 'Advanced Filters'}
                  </h2>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-xs font-bold text-[#F97316] hover:underline"
                  >
                    {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
                  </button>
                </div>

                {/* Buy or Rent */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">
                    {lang === 'ar' ? 'شراء أو إيجار' : 'Buy or Rent'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['all', 'sale', 'rent'] as const).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFilterListingType(val)}
                        className={`py-2 rounded-lg font-bold border ${
                          filterListingType === val
                            ? 'bg-[#0B192C] text-white border-[#0B192C]'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {val === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : val === 'sale' ? (lang === 'ar' ? 'بيع' : 'Buy') : (lang === 'ar' ? 'إيجار' : 'Rent')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* New or Used */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">
                    {lang === 'ar' ? 'حالة المعدة' : 'Condition'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['all', 'new', 'used'] as const).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFilterCondition(val)}
                        className={`py-2 rounded-lg font-bold border ${
                          filterCondition === val
                            ? 'bg-[#F97316] text-white border-[#F97316]'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {val === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : val === 'new' ? (lang === 'ar' ? 'جديد' : 'New') : (lang === 'ar' ? 'مستعمل' : 'Used')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Select */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'القسم / الفئة' : 'Category'}
                  </label>
                  <select
                    value={filterCategory}
                    onChange={e => {
                      setFilterCategory(e.target.value);
                      setSearchScopeCategory('all');
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold"
                  >
                    <option value="all">{lang === 'ar' ? 'كل الأقسام' : 'All Categories'}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ar' ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'الشركة المصنعة (الماركة)' : 'Manufacturer / Brand'}
                  </label>
                  <select
                    value={filterBrand}
                    onChange={e => setFilterBrand(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold"
                  >
                    <option value="all">{lang === 'ar' ? 'جميع الماركات' : 'All Manufacturers'}</option>
                    {BRANDS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Governorate */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'المحافظة' : 'Governorate'}
                  </label>
                  <select
                    value={selectedGovernorate}
                    onChange={e => setSelectedGovernorate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold"
                  >
                    {GOVERNORATES.map(g => (
                      <option key={g.id} value={g.id}>
                        {lang === 'ar' ? g.nameAr : g.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Manufacturing Year Range */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'سنة الصنع' : 'Manufacturing Year'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder={lang === 'ar' ? 'من (2015)' : 'From'}
                      value={filterYearMin}
                      onChange={e => setFilterYearMin(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <input
                      type="number"
                      placeholder={lang === 'ar' ? 'إلى (2026)' : 'To'}
                      value={filterYearMax}
                      onChange={e => setFilterYearMax(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                {/* Price Range (EGP) */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    {lang === 'ar' ? 'نطاق السعر (ج.م)' : 'Price Range (EGP)'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder={lang === 'ar' ? 'الحد الأدنى' : 'Min EGP'}
                      value={filterPriceMin}
                      onChange={e => setFilterPriceMin(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <input
                      type="number"
                      placeholder={lang === 'ar' ? 'الحد الأقصى' : 'Max EGP'}
                      value={filterPriceMax}
                      onChange={e => setFilterPriceMax(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                {/* Verified Sellers Only */}
                <label className="flex items-center gap-2.5 pt-2 border-t border-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterVerifiedOnly}
                    onChange={e => setFilterVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#F97316] rounded"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <BadgeCheck className="w-4 h-4 text-sky-500" />
                    {lang === 'ar' ? 'التجار المعتمدون فقط' : 'Verified Dealers Only'}
                  </span>
                </label>
              </aside>

              {/* RESULTS GRID */}
              <div className="lg:col-span-9 space-y-6">
                {paginatedEquipment.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-black text-lg text-slate-800 mb-1">
                      {lang === 'ar' ? 'لا توجد معدات مطابقة لخيارات البحث' : 'No matching machinery found'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {lang === 'ar' ? 'جرب توسيع نطاق السعر أو إعادة ضبط الفلاتر لعرض جميع المعدات' : 'Try broadening your filters or resetting criteria'}
                    </p>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="px-5 py-2.5 rounded-xl bg-[#F97316] text-white text-xs font-bold"
                    >
                      {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset All Filters'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedEquipment.map(eq => (
                        <EquipmentCard key={eq.id} eq={eq} />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => {
                              setCurrentPage(page);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-9 h-9 rounded-xl font-bold text-xs transition ${
                              currentPage === page
                                ? 'bg-[#0B192C] text-white shadow'
                                : 'bg-white text-slate-700 border border-slate-200 hover:border-[#F97316]'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 3: FULL EQUIPMENT DETAILS PAGE                                */}
        {/* ------------------------------------------------------------------ */}
        {activeView === 'details' && selectedEquipment && (
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <button type="button" onClick={() => setActiveView('home')} className="hover:text-[#F97316]">
                  {lang === 'ar' ? 'الرئيسية' : 'Home'}
                </button>
                <span>/</span>
                <button type="button" onClick={() => setActiveView('catalog')} className="hover:text-[#F97316]">
                  {getCatName(selectedEquipment.categoryId)}
                </button>
                <span>/</span>
                <span className="font-bold text-slate-800">{selectedEquipment.stockCode}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCompare(selectedEquipment.id)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:border-[#F97316] flex items-center gap-1"
                >
                  <Scale className="w-3.5 h-3.5 text-[#F97316]" />
                  {lang === 'ar' ? 'مقارنة' : 'Compare'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(selectedEquipment)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-red-600 hover:bg-red-50 flex items-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'إبلاغ عن الإعلان' : 'Report'}
                </button>
              </div>
            </div>

            {/* Top Grid: Gallery + Purchase & Seller Panel */}
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left/Main: Photo Gallery & Specifications */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 mb-3">
                    <img
                      src={selectedEquipment.images[selectedImageIdx] || selectedEquipment.images[0]}
                      alt={lang === 'ar' ? selectedEquipment.titleAr : selectedEquipment.titleEn}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 start-3 flex gap-2">
                      <span className="px-3 py-1 rounded-lg bg-[#0B192C] text-white text-xs font-extrabold">
                        {selectedEquipment.listingType === 'sale'
                          ? (lang === 'ar' ? 'للبيع' : 'For Sale')
                          : (lang === 'ar' ? 'للإيجار' : 'For Rent')}
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-[#F97316] text-white text-xs font-extrabold">
                        {selectedEquipment.condition === 'new'
                          ? (lang === 'ar' ? 'جديد زيرو' : 'Brand New')
                          : (lang === 'ar' ? 'مستعمل بحالة ممتازة' : 'Used')}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnails */}
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {selectedEquipment.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                          selectedImageIdx === idx ? 'border-[#F97316] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title, Description & Technical Specifications Table */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="font-bold text-[#F97316]">{selectedEquipment.brand}</span>
                      <span>•</span>
                      <span>{lang === 'ar' ? 'كود المعدة:' : 'Stock ID:'} {selectedEquipment.stockCode}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {selectedEquipment.views} {lang === 'ar' ? 'مشاهدة' : 'views'}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#0B192C] leading-snug">
                      {lang === 'ar' ? selectedEquipment.titleAr : selectedEquipment.titleEn}
                    </h1>
                  </div>

                  <div>
                    <h2 className="font-black text-base text-[#0B192C] mb-2">
                      {lang === 'ar' ? 'الوصف التفصيلي وحالة المعدة' : 'Equipment Description'}
                    </h2>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {lang === 'ar' ? selectedEquipment.descriptionAr : selectedEquipment.descriptionEn}
                    </p>
                  </div>

                  {/* Technical Specs Grid */}
                  <div>
                    <h2 className="font-black text-base text-[#0B192C] mb-3">
                      {lang === 'ar' ? 'المواصفات الفنية والهندسية' : 'Technical Specifications'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { labelAr: 'الشركة المصنعة', labelEn: 'Manufacturer', val: selectedEquipment.brand },
                        { labelAr: 'الموديل', labelEn: 'Model', val: selectedEquipment.model },
                        { labelAr: 'سنة الصنع', labelEn: 'Manufacturing Year', val: String(selectedEquipment.year) },
                        { labelAr: 'ساعات التشغيل', labelEn: 'Operating Hours', val: `${selectedEquipment.operatingHours.toLocaleString()} hrs` },
                        { labelAr: 'الحالة', labelEn: 'Condition', val: selectedEquipment.condition === 'new' ? (lang === 'ar' ? 'جديد' : 'New') : (lang === 'ar' ? 'مستعمل' : 'Used') },
                        { labelAr: 'الوزن التشغيلي', labelEn: 'Operating Weight', val: `${selectedEquipment.weightTons} ${lang === 'ar' ? 'طن' : 'Tons'}` },
                        { labelAr: 'المحرك والقدرة', labelEn: 'Engine Specifications', val: lang === 'ar' ? selectedEquipment.engineSpecsAr : selectedEquipment.engineSpecsEn },
                        { labelAr: 'موقع المعدة', labelEn: 'Location', val: getGovName(selectedEquipment.governorateId) },
                      ].map((spec, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                          <span className="text-slate-500 font-semibold">{lang === 'ar' ? spec.labelAr : spec.labelEn}</span>
                          <span className="font-bold text-[#0B192C] text-end">{spec.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reviews & Ratings Section */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h2 className="font-black text-base text-[#0B192C]">
                    {lang === 'ar' ? 'تقييمات المعاينة والمشترين' : 'Buyer & Inspection Reviews'}
                  </h2>
                  <div className="space-y-3">
                    {reviews
                      .filter(r => r.equipmentId === selectedEquipment.id)
                      .map(r => (
                        <div key={r.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900">{r.userName}</span>
                            <span className="text-amber-500 text-xs font-bold">{'★'.repeat(r.rating)}</span>
                          </div>
                          <p className="text-xs text-slate-600">{r.comment}</p>
                        </div>
                      ))}
                  </div>
                  <form
                    onSubmit={async e => {
                      e.preventDefault();
                      if (isSupabaseConfigured && (!currentUser || currentUser.role !== 'buyer')) { triggerToast(lang === 'ar' ? 'سجّل الدخول بحساب مشتري لإضافة تقييم' : 'Sign in with a buyer account to review', 'warning'); return; }
                      const fd = new FormData(e.currentTarget);
                      const comment = String(fd.get('comment') || '').trim();
                      if (!comment) return;
                      const reviewItem: ReviewItem = {
                          id: isSupabaseConfigured ? crypto.randomUUID() : `rev-${Date.now()}`,
                          equipmentId: selectedEquipment.id,
                          userName: currentUser ? (lang === 'ar' ? currentUser.nameAr : currentUser.nameEn) : 'زائر منصة أليكس تراك',
                          rating: 5,
                          comment,
                          date: new Date().toISOString(),
                        };
                      if (isSupabaseConfigured && currentUser) {
                        try { await marketplaceApi.saveReview(reviewItem, currentUser.id); }
                        catch (error: any) { triggerToast(error.message || 'تعذر حفظ التقييم', 'warning'); return; }
                      }
                      setReviews(prev => [
                        reviewItem,
                        ...prev,
                      ]);
                      e.currentTarget.reset();
                      triggerToast(lang === 'ar' ? 'تم نشر تقييمك بنجاح' : 'Review posted successfully');
                    }}
                    className="flex gap-2 pt-2"
                  >
                    <input
                      name="comment"
                      type="text"
                      required
                      placeholder={lang === 'ar' ? 'أضف تعليقك أو تجربتك مع التاجر...' : 'Write a review or inspection feedback...'}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#132844]"
                    >
                      {lang === 'ar' ? 'إرسال' : 'Post'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Sticky Column: Price & Verified Dealer Contact */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg space-y-5 sticky top-28">
                  <div>
                    <span className="text-xs font-bold text-slate-500 block mb-1">
                      {selectedEquipment.listingType === 'sale'
                        ? (lang === 'ar' ? 'السعر المطلوب' : 'Asking Price')
                        : (lang === 'ar' ? 'قيمة الإيجار' : 'Rental Rate')}
                    </span>
                    <div className="text-3xl font-black text-[#0B192C]">
                      {formatPrice(selectedEquipment.priceEgp)}
                      {selectedEquipment.listingType === 'rent' && (
                        <span className="text-sm font-bold text-emerald-700 ms-1">
                          / {selectedEquipment.rentPeriod === 'day' ? (lang === 'ar' ? 'يوم' : 'day') : (lang === 'ar' ? 'شهر' : 'month')}
                        </span>
                      )}
                    </div>
                    {selectedEquipment.originalPriceEgp && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatPrice(selectedEquipment.originalPriceEgp)}
                      </span>
                    )}
                  </div>

                  {/* Direct Contact CTAs */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setShowInquiryModal(selectedEquipment)}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {lang === 'ar' ? 'إرسال استفسار مباشر للبائع' : 'Send Direct Seller Inquiry'}
                    </button>

                    <a
                      href={`https://wa.me/${selectedEquipment.sellerWhatsapp}?text=${encodeURIComponent(`مرحباً، أستفسر بخصوص المعدة ${selectedEquipment.stockCode} المعروضة على منصة ALEX TRACK`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition"
                    >
                      <Phone className="w-5 h-5" />
                      {lang === 'ar' ? 'تواصل عبر واتساب فوراً' : 'Chat on WhatsApp'}
                    </a>

                    <a
                      href={`tel:${selectedEquipment.sellerPhone}`}
                      className="w-full py-3 px-4 rounded-xl bg-[#0B192C] hover:bg-[#132844] text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                    >
                      <Phone className="w-4 h-4 text-[#F97316]" />
                      <span dir="ltr">{selectedEquipment.sellerPhone}</span>
                    </a>
                  </div>

                  {/* Seller Info Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#0B192C] text-white font-black text-lg flex items-center justify-center">
                        {selectedEquipment.sellerNameEn.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm text-slate-900">
                            {lang === 'ar' ? selectedEquipment.sellerNameAr : selectedEquipment.sellerNameEn}
                          </span>
                          {selectedEquipment.sellerVerified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="text-amber-500 font-bold">★ {selectedEquipment.sellerRating}</span>
                          <span>•</span>
                          <span>{getGovName(selectedEquipment.governorateId)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyPresetFilter({ sellerId: selectedEquipment.sellerId })}
                      className="w-full py-2 rounded-xl bg-white border border-slate-300 hover:border-[#0B192C] text-xs font-bold text-slate-800 transition"
                    >
                      {lang === 'ar' ? 'عرض جميع معدات هذا التاجر' : 'View All Dealer Listings'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Similar Equipment Recommendations */}
            <section className="pt-4">
              <h2 className="text-xl font-black text-[#0B192C] mb-4">
                {lang === 'ar' ? 'معدات مشابهة قد تهمك' : 'Similar Equipment Recommendations'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {publicEquipment
                  .filter(e => e.id !== selectedEquipment.id && (e.categoryId === selectedEquipment.categoryId || e.brand === selectedEquipment.brand))
                  .slice(0, 4)
                  .map(eq => (
                    <EquipmentCard key={eq.id} eq={eq} />
                  ))}
              </div>
            </section>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 4: SELLER / DEALER DASHBOARD                                  */}
        {/* ------------------------------------------------------------------ */}
        {activeView === 'seller-dashboard' && (
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0B192C] text-white p-6 rounded-3xl shadow-lg">
              <div>
                <span className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                  {lang === 'ar' ? 'بوابة التجار والوكلاء المعتمدين' : 'VERIFIED DEALER PORTAL'}
                </span>
                <h1 className="text-2xl font-black mt-1">
                  {lang === 'ar'
                    ? `أهلاً بك، ${currentUser?.nameAr || 'شركة النيل للمعدات'}`
                    : `Welcome, ${currentUser?.nameEn || 'Nile Heavy Machinery'}`}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingEquipment(null);
                  setShowEquipmentFormModal(true);
                }}
                className="px-5 py-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold text-sm shadow-lg flex items-center gap-2 transition"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إضافة معدة جديدة' : 'Add New Equipment'}
              </button>
            </div>

            {/* Seller KPIs */}
            {(() => {
              const myListings = equipmentList.filter(e => e.sellerId === (currentUser?.id || 'seller-1'));
              const totalViews = myListings.reduce((sum, item) => sum + item.views, 0);
              const myInquiries = inquiries.filter(i => i.sellerId === (currentUser?.id || 'seller-1'));
              return (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'إجمالي إعلاناتي' : 'My Listings'}</div>
                      <div className="text-2xl font-black text-[#0B192C] mt-1">{myListings.length}</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'إجمالي المشاهدات' : 'Total Views'}</div>
                      <div className="text-2xl font-black text-[#F97316] mt-1">{totalViews.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'استفسارات العملاء' : 'Buyer Inquiries'}</div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">{myInquiries.length}</div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'تقييم المعرض' : 'Showroom Rating'}</div>
                      <div className="text-2xl font-black text-amber-500 mt-1">★ {currentUser?.rating || 4.9}</div>
                    </div>
                  </div>

                  {/* Manage My Equipment Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="font-black text-base text-[#0B192C]">
                        {lang === 'ar' ? 'إدارة معداتي وإعلاناتي المنشورة' : 'Manage My Equipment Listings'}
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-start">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 text-start">{lang === 'ar' ? 'المعدة' : 'Equipment'}</th>
                            <th className="p-3.5 text-start">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                            <th className="p-3.5 text-start">{lang === 'ar' ? 'المشاهدات' : 'Views'}</th>
                            <th className="p-3.5 text-start">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                            <th className="p-3.5 text-start">{lang === 'ar' ? 'إعلان مميز' : 'Featured Ad'}</th>
                            <th className="p-3.5 text-start">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {myListings.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/70">
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  <img src={item.images[0]} alt="" className="w-12 h-10 rounded-lg object-cover shrink-0" />
                                  <div>
                                    <div className="font-bold text-slate-900 max-w-xs truncate">
                                      {lang === 'ar' ? item.titleAr : item.titleEn}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {item.brand} • {item.year} • {getGovName(item.governorateId)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5 font-extrabold text-[#0B192C]">{formatPrice(item.priceEgp)}</td>
                              <td className="p-3.5 font-bold">{item.views}</td>
                              <td className="p-3.5">
                                <select
                                  value={item.status}
                                  disabled={isSupabaseConfigured && item.status === 'pending'}
                                  onChange={async e => {
                                    const newStatus = e.target.value as ListingStatus;
                                    if (isSupabaseConfigured) { try { await marketplaceApi.updateEquipment(item.id, { status: newStatus }); } catch (error: any) { triggerToast(error.message || 'تعذر تحديث الحالة', 'warning'); return; } }
                                    setEquipmentList(prev =>
                                      prev.map(eq => (eq.id === item.id ? { ...eq, status: newStatus } : eq))
                                    );
                                    triggerToast(lang === 'ar' ? 'تم تحديث حالة المعدة' : 'Equipment status updated');
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold bg-white"
                                >
                                  <option value="active">{lang === 'ar' ? 'نشط ومتاح' : 'Active'}</option>
                                  <option value="sold">{lang === 'ar' ? 'تم البيع' : 'Sold'}</option>
                                  <option value="rented">{lang === 'ar' ? 'تم التأجير' : 'Rented'}</option>
                                  {(item.status === 'pending' || item.status === 'rejected') && <option value="pending">{lang === 'ar' ? 'قيد المراجعة' : 'Pending'}</option>}
                                  {item.status === 'rejected' && <option value="rejected">{lang === 'ar' ? 'مرفوض' : 'Rejected'}</option>}
                                </select>
                              </td>
                              <td className="p-3.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (isSupabaseConfigured) { triggerToast(lang === 'ar' ? 'ميزة الإعلانات المميزة متاحة لإدارة المنصة فقط' : 'Featured placement is controlled by platform admins', 'warning'); return; }
                                    setEquipmentList(prev =>
                                      prev.map(eq => (eq.id === item.id ? { ...eq, isFeatured: !eq.isFeatured } : eq))
                                    );
                                    triggerToast(lang === 'ar' ? 'تم تحديث حالة الإعلان المميز' : 'Featured status toggled');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg font-bold ${
                                    item.isFeatured ? 'bg-orange-100 text-[#F97316]' : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {item.isFeatured ? (lang === 'ar' ? 'مميز ★' : 'Featured ★') : (lang === 'ar' ? 'عادي' : 'Standard')}
                                </button>
                              </td>
                              <td className="p-3.5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEquipment(item);
                                      setShowEquipmentFormModal(true);
                                    }}
                                    className="p-2 rounded-lg bg-slate-100 hover:bg-[#0B192C] hover:text-white text-slate-700 transition"
                                    title={lang === 'ar' ? 'تعديل' : 'Edit'}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (isSupabaseConfigured) { try { await marketplaceApi.deleteEquipment(item.id); } catch (error: any) { triggerToast(error.message || 'تعذر حذف الإعلان', 'warning'); return; } }
                                      setEquipmentList(prev => prev.filter(eq => eq.id !== item.id));
                                      triggerToast(lang === 'ar' ? 'تم حذف الإعلان' : 'Listing deleted', 'info');
                                    }}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-600 hover:text-white text-red-600 transition"
                                    title={lang === 'ar' ? 'حذف' : 'Delete'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Customer Inquiries Inbox */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h2 className="font-black text-base text-[#0B192C]">
                      {lang === 'ar' ? 'رسائل واستفسارات المشترين الواردة' : 'Customer Inquiries Inbox'}
                    </h2>
                    <div className="space-y-3">
                      {myInquiries.map(inq => (
                        <div key={inq.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-xs text-[#F97316]">
                              {lang === 'ar' ? inq.equipmentTitleAr : inq.equipmentTitleEn}
                            </span>
                            <span className="text-[11px] text-slate-400">{inq.createdAt}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            {inq.buyerName} • <span dir="ltr">{inq.buyerPhone}</span>
                          </div>
                          <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100">
                            {inq.message}
                          </p>
                          {inq.reply ? (
                            <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl font-semibold">
                              ✓ {lang === 'ar' ? 'ردك:' : 'Your Reply:'} {inq.reply}
                            </div>
                          ) : (
                            <form
                              onSubmit={async e => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                const rep = String(fd.get('reply') || '').trim();
                                if (!rep) return;
                                if (isSupabaseConfigured) { try { await marketplaceApi.replyInquiry(inq.id, rep); } catch (error: any) { triggerToast(error.message || 'تعذر إرسال الرد', 'warning'); return; } }
                                setInquiries(prev =>
                                  prev.map(item => (item.id === inq.id ? { ...item, reply: rep, read: true } : item))
                                );
                                triggerToast(lang === 'ar' ? 'تم إرسال الرد للمشتري' : 'Reply sent to buyer');
                              }}
                              className="flex gap-2"
                            >
                              <input
                                name="reply"
                                type="text"
                                required
                                placeholder={lang === 'ar' ? 'اكتب ردك للمشتري...' : 'Type your reply...'}
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                              />
                              <button
                                type="submit"
                                className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
                              >
                                {lang === 'ar' ? 'رد' : 'Reply'}
                              </button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 5: SUPER ADMIN DASHBOARD                                      */}
        {/* ------------------------------------------------------------------ */}
        {activeView === 'admin-dashboard' && (
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <div className="bg-gradient-to-r from-[#0B192C] to-slate-900 text-white p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4 border border-slate-700">
              <div>
                <span className="px-2.5 py-1 rounded bg-red-600 text-white text-[11px] font-black uppercase">
                  SUPER ADMIN CONTROL CENTER
                </span>
                <h1 className="text-2xl font-black mt-2">
                  {lang === 'ar' ? 'لوحة الإدارة والتحكم الشاملة — ALEX TRACK' : 'ALEX TRACK Platform Administration'}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setShowSupabaseModal(true)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2"
              >
                <FileCode2 className="w-4 h-4 text-[#F97316]" />
                {lang === 'ar' ? 'عرض كود قاعدة البيانات SQL' : 'View Supabase SQL Schema'}
              </button>
            </div>

            {/* Platform Analytics KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { labelAr: 'إجمالي المستخدمين', labelEn: 'Total Users', val: usersList.length, color: 'text-[#0B192C]' },
                { labelAr: 'التجار والبائعون', labelEn: 'Total Sellers', val: usersList.filter(u => u.role === 'seller').length, color: 'text-sky-600' },
                { labelAr: 'إجمالي الإعلانات', labelEn: 'Total Listings', val: equipmentList.length, color: 'text-[#0B192C]' },
                { labelAr: 'الإعلانات النشطة', labelEn: 'Active Listings', val: equipmentList.filter(e => e.status === 'active').length, color: 'text-emerald-600' },
                { labelAr: 'بانتظار الموافقة', labelEn: 'Pending Review', val: pendingListingsCount, color: 'text-[#F97316]' },
                { labelAr: 'البلاغات المفتوحة', labelEn: 'Open Reports', val: reports.filter(r => r.status === 'open').length, color: 'text-red-600' },
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500">{lang === 'ar' ? kpi.labelAr : kpi.labelEn}</div>
                  <div className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.val}</div>
                </div>
              ))}
            </div>

            {/* 1. Listings Moderation Queue (Approve / Reject) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-black text-base text-[#0B192C]">
                  {lang === 'ar' ? 'مراجعة واعتماد الإعلانات' : 'Listings Moderation & Approval Queue'}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 text-start">{lang === 'ar' ? 'المعدة' : 'Machine'}</th>
                      <th className="p-3.5 text-start">{lang === 'ar' ? 'البائع' : 'Seller'}</th>
                      <th className="p-3.5 text-start">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                      <th className="p-3.5 text-start">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="p-3.5 text-start">{lang === 'ar' ? 'قرار الإدارة' : 'Moderation'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipmentList.map(eq => (
                      <tr key={eq.id} className={eq.status === 'pending' ? 'bg-orange-50/50' : ''}>
                        <td className="p-3.5 font-bold text-slate-900">
                          {lang === 'ar' ? eq.titleAr : eq.titleEn}
                        </td>
                        <td className="p-3.5">{lang === 'ar' ? eq.sellerNameAr : eq.sellerNameEn}</td>
                        <td className="p-3.5 font-extrabold">{formatPrice(eq.priceEgp)}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                              eq.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : eq.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {eq.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                if (isSupabaseConfigured) { try { await marketplaceApi.updateEquipment(eq.id, { status: 'active' }); } catch (error: any) { triggerToast(error.message || 'تعذر اعتماد الإعلان', 'warning'); return; } }
                                setEquipmentList(prev =>
                                  prev.map(item => (item.id === eq.id ? { ...item, status: 'active' } : item))
                                );
                                triggerToast(lang === 'ar' ? 'تم اعتماد ونشر الإعلان' : 'Listing approved & published');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              {lang === 'ar' ? 'اعتماد' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (isSupabaseConfigured) { try { await marketplaceApi.updateEquipment(eq.id, { status: 'rejected' }); } catch (error: any) { triggerToast(error.message || 'تعذر رفض الإعلان', 'warning'); return; } }
                                setEquipmentList(prev =>
                                  prev.map(item => (item.id === eq.id ? { ...item, status: 'rejected' } : item))
                                );
                                triggerToast(lang === 'ar' ? 'تم رفض الإعلان' : 'Listing rejected', 'warning');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
                            >
                              {lang === 'ar' ? 'رفض' : 'Reject'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const isFeatured = !eq.isFeatured;
                                if (isSupabaseConfigured) { try { await marketplaceApi.updateEquipment(eq.id, { is_featured: isFeatured }); } catch (error: any) { triggerToast(error.message || 'تعذر تحديث تمييز الإعلان', 'warning'); return; } }
                                setEquipmentList(prev => prev.map(item => item.id === eq.id ? { ...item, isFeatured } : item));
                                triggerToast(lang === 'ar' ? 'تم تحديث تمييز الإعلان' : 'Featured placement updated');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold"
                            >
                              {eq.isFeatured ? (lang === 'ar' ? 'إلغاء التمييز' : 'Unfeature') : (lang === 'ar' ? 'تمييز' : 'Feature')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Manage Users & Verify Sellers */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h2 className="font-black text-base text-[#0B192C]">
                  {lang === 'ar' ? 'إدارة المستخدمين وتوثيق التجار' : 'Manage Users & Verify Sellers'}
                </h2>
                <div className="space-y-2.5">
                  {usersList.map(u => (
                    <div key={u.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <span>{lang === 'ar' ? u.nameAr : u.nameEn}</span>
                          {u.verified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {u.role.toUpperCase()} • {u.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            if (isSupabaseConfigured) { try { await marketplaceApi.updateUserModeration(u.id, { is_verified: !u.verified }); } catch (error: any) { triggerToast(error.message || 'تعذر تحديث التوثيق', 'warning'); return; } }
                            setUsersList(prev =>
                              prev.map(user => (user.id === u.id ? { ...user, verified: !user.verified } : user))
                            );
                            triggerToast(lang === 'ar' ? 'تم تحديث حالة التوثيق' : 'Verification updated');
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold ${
                            u.verified ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {u.verified ? (lang === 'ar' ? 'موثق ✓' : 'Verified ✓') : (lang === 'ar' ? 'توثيق' : 'Verify')}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (isSupabaseConfigured) { try { await marketplaceApi.updateUserModeration(u.id, { is_suspended: !u.suspended }); } catch (error: any) { triggerToast(error.message || 'تعذر تحديث حالة الحساب', 'warning'); return; } }
                            setUsersList(prev =>
                              prev.map(user => (user.id === u.id ? { ...user, suspended: !user.suspended } : user))
                            );
                            triggerToast(lang === 'ar' ? 'تم تحديث حالة الحساب' : 'Account status updated', 'warning');
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold ${
                            u.suspended ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {u.suspended ? (lang === 'ar' ? 'محظور' : 'Suspended') : (lang === 'ar' ? 'إيقاف' : 'Suspend')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Reported Listings & Homepage Banners */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <h2 className="font-black text-base text-[#0B192C]">
                    {lang === 'ar' ? 'بلاغات المستخدمين' : 'Reported Listings'}
                  </h2>
                  {reports.map(rep => (
                    <div key={rep.id} className="p-3.5 rounded-2xl bg-red-50/60 border border-red-200 text-xs space-y-2">
                      <div className="flex justify-between font-bold text-red-900">
                        <span>{lang === 'ar' ? rep.equipmentTitleAr : rep.equipmentTitleEn}</span>
                        <span>{rep.status.toUpperCase()}</span>
                      </div>
                      <p className="text-slate-700">{rep.reason} — {rep.details}</p>
                      {rep.status === 'open' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (isSupabaseConfigured) { try { await marketplaceApi.updateReport(rep.id, 'resolved'); } catch (error: any) { triggerToast(error.message || 'تعذر تحديث البلاغ', 'warning'); return; } }
                              setReports(prev => prev.map(r => (r.id === rep.id ? { ...r, status: 'resolved' } : r)));
                              triggerToast(lang === 'ar' ? 'تمت معالجة البلاغ' : 'Report resolved');
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                          >
                            {lang === 'ar' ? 'معالجة وإغلاق' : 'Resolve'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Manage Homepage Banners */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <h2 className="font-black text-base text-[#0B192C]">
                    {lang === 'ar' ? 'إدارة بانرات الصفحة الرئيسية' : 'Homepage Hero Banners'}
                  </h2>
                  {banners.map(b => (
                    <div key={b.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold truncate max-w-xs">{lang === 'ar' ? b.titleAr : b.titleEn}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (isSupabaseConfigured) { try { await marketplaceApi.updateBanner(b.id, !b.active); } catch (error: any) { triggerToast(error.message || 'تعذر تحديث البانر', 'warning'); return; } }
                          setBanners(prev => prev.map(item => (item.id === b.id ? { ...item, active: !item.active } : item)));
                        }}
                        className={`px-3 py-1 rounded-lg font-bold ${
                          b.active ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {b.active ? (lang === 'ar' ? 'مفعل' : 'Active') : (lang === 'ar' ? 'مخفي' : 'Hidden')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 6: USER PROFILE & FAVORITES                                   */}
        {/* ------------------------------------------------------------------ */}
        {activeView === 'profile' && currentUser && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h1 className="text-xl font-black text-[#0B192C]">
                  {lang === 'ar' ? 'الملف الشخصي وإعدادات الحساب' : 'User Profile & Account Settings'}
                </h1>
                <button
                  type="button"
                  onClick={async () => {
                    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
                    setCurrentUser(null); setActiveView('home');
                    triggerToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                </button>
              </div>

              <form
                onSubmit={async e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const updated: AppUser = {
                    ...currentUser,
                    nameAr: String(fd.get('nameAr') || currentUser.nameAr),
                    nameEn: String(fd.get('nameEn') || currentUser.nameEn),
                    phone: String(fd.get('phone') || currentUser.phone),
                    governorateId: String(fd.get('governorateId') || currentUser.governorateId),
                  };
                  setCurrentUser(updated);
                  setUsersList(prev => prev.map(u => (u.id === updated.id ? updated : u)));
                  if (isSupabaseConfigured) { try { await marketplaceApi.updateProfile(updated); } catch (error: any) { triggerToast(error.message || 'تعذر حفظ الملف الشخصي', 'warning'); return; } }
                  triggerToast(lang === 'ar' ? 'تم حفظ بيانات الحساب بنجاح' : 'Profile updated successfully');
                }}
                className="grid sm:grid-cols-2 gap-4 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
                  <input name="nameAr" defaultValue={currentUser.nameAr} className="w-full p-2.5 rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}</label>
                  <input name="nameEn" defaultValue={currentUser.nameEn} className="w-full p-2.5 rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                  <input name="phone" defaultValue={currentUser.phone} className="w-full p-2.5 rounded-xl border border-slate-300" dir="ltr" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{lang === 'ar' ? 'المحافظة' : 'Governorate'}</label>
                  <select name="governorateId" defaultValue={currentUser.governorateId} className="w-full p-2.5 rounded-xl border border-slate-300">
                    {GOVERNORATES.filter(g => g.id !== 'all').map(g => (
                      <option key={g.id} value={g.id}>{lang === 'ar' ? g.nameAr : g.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" className="px-6 py-3 rounded-xl bg-[#F97316] text-white font-extrabold">
                    {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* 9. MODALS & DRAWERS (COMPARE, FAVORITES, INQUIRY, ADD EQUIPMENT, ETC) */}
      {/* ==================================================================== */}

      {/* A. SIDE-BY-SIDE EQUIPMENT COMPARISON MODAL */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 bg-[#0B192C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#F97316]" />
                <h3 className="font-black text-base">
                  {lang === 'ar' ? 'مقارنة المواصفات الفنية جنباً إلى جنب' : 'Side-by-Side Technical Comparison'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowCompareModal(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-auto">
              {compareIds.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-500">
                  {lang === 'ar' ? 'لم تقم بإضافة أي معدات للمقارنة بعد. اضغط على أيقونة الميزان على بطاقة أي معدة.' : 'No machines selected for comparison yet.'}
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 bg-slate-100 text-start font-black text-slate-700 w-36">
                        {lang === 'ar' ? 'المواصفة' : 'Specification'}
                      </th>
                      {compareIds
                        .map(id => equipmentList.find(e => e.id === id))
                        .filter((e): e is Equipment => Boolean(e))
                        .map(eq => (
                          <th key={eq.id} className="p-3 border border-slate-200 align-top min-w-[200px]">
                            <img src={eq.images[0]} alt="" className="w-full h-28 object-cover rounded-xl mb-2" />
                            <div className="font-bold text-slate-900 text-start line-clamp-2">
                              {lang === 'ar' ? eq.titleAr : eq.titleEn}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCompare(eq.id)}
                              className="mt-2 text-[11px] text-red-600 hover:underline font-bold"
                            >
                              {lang === 'ar' ? 'إزالة' : 'Remove'}
                            </button>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      { kAr: 'السعر', kEn: 'Price', fn: (e: Equipment) => formatPrice(e.priceEgp) },
                      { kAr: 'الماركة', kEn: 'Brand', fn: (e: Equipment) => e.brand },
                      { kAr: 'الموديل', kEn: 'Model', fn: (e: Equipment) => e.model },
                      { kAr: 'سنة الصنع', kEn: 'Year', fn: (e: Equipment) => String(e.year) },
                      { kAr: 'ساعات التشغيل', kEn: 'Hours', fn: (e: Equipment) => `${e.operatingHours.toLocaleString()} hrs` },
                      { kAr: 'الوزن التشغيلي', kEn: 'Weight', fn: (e: Equipment) => `${e.weightTons} Tons` },
                      { kAr: 'المحرك', kEn: 'Engine', fn: (e: Equipment) => (lang === 'ar' ? e.engineSpecsAr : e.engineSpecsEn) },
                      { kAr: 'المحافظة', kEn: 'Location', fn: (e: Equipment) => getGovName(e.governorateId) },
                    ].map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="p-3 bg-slate-50 font-bold text-slate-700">{lang === 'ar' ? row.kAr : row.kEn}</td>
                        {compareIds
                          .map(id => equipmentList.find(e => e.id === id))
                          .filter((e): e is Equipment => Boolean(e))
                          .map(eq => (
                            <td key={eq.id} className="p-3 border border-slate-200 font-semibold text-slate-900">
                              {row.fn(eq)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* B. FAVORITES DRAWER */}
      {showFavoritesDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
            <div className="p-5 bg-[#0B192C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-current" />
                <h3 className="font-black text-base">
                  {lang === 'ar' ? `المعدات المفضلة (${favorites.length})` : `Saved Favorites (${favorites.length})`}
                </h3>
              </div>
              <button type="button" onClick={() => setShowFavoritesDrawer(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {favorites.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-12">
                  {lang === 'ar' ? 'قائمة المفضلة فارغة حالياً' : 'Your favorites list is empty'}
                </p>
              ) : (
                favorites
                  .map(id => equipmentList.find(e => e.id === id))
                  .filter((e): e is Equipment => Boolean(e))
                  .map(eq => (
                    <div
                      key={eq.id}
                      onClick={() => {
                        setShowFavoritesDrawer(false);
                        openEquipmentDetails(eq);
                      }}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-[#F97316] flex items-center gap-3 cursor-pointer"
                    >
                      <img src={eq.images[0]} alt="" className="w-16 h-14 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {lang === 'ar' ? eq.titleAr : eq.titleEn}
                        </div>
                        <div className="text-xs font-black text-[#F97316] mt-1">{formatPrice(eq.priceEgp)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={e => toggleFavorite(eq.id, e)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* C. DIRECT SELLER INQUIRY MODAL */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#0B192C] text-white flex items-center justify-between">
              <h3 className="font-black text-base">
                {lang === 'ar' ? 'إرسال استفسار مباشر للتاجر' : 'Direct Seller Inquiry'}
              </h3>
              <button type="button" onClick={() => setShowInquiryModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const newInq: Inquiry = {
                  id: isSupabaseConfigured ? crypto.randomUUID() : `inq-${Date.now()}`, 
                  equipmentId: showInquiryModal.id,
                  equipmentTitleAr: showInquiryModal.titleAr,
                  equipmentTitleEn: showInquiryModal.titleEn,
                  sellerId: showInquiryModal.sellerId,
                  buyerName: String(fd.get('buyerName') || ''),
                  buyerPhone: String(fd.get('buyerPhone') || ''),
                  message: String(fd.get('message') || ''),
                  createdAt: new Date().toISOString(),
                  read: false,
                };
                if (isSupabaseConfigured) { try { await marketplaceApi.saveInquiry(newInq, currentUser?.id); } catch (error: any) { triggerToast(error.message || 'تعذر إرسال الاستفسار', 'warning'); return; } }
                setInquiries(prev => [newInq, ...prev]);
                setShowInquiryModal(null);
                triggerToast(
                  lang === 'ar'
                    ? 'تم إرسال استفسارك بنجاح وسيظهر فوراً في لوحة البائع'
                    : 'Inquiry sent! Visible in Seller Dashboard immediately'
                );
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800">
                {lang === 'ar' ? showInquiryModal.titleAr : showInquiryModal.titleEn}
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input
                  name="buyerName"
                  required
                  defaultValue={currentUser ? (lang === 'ar' ? currentUser.nameAr : currentUser.nameEn) : ''}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</label>
                <input
                  name="buyerPhone"
                  required
                  defaultValue={currentUser?.phone || '+2010'}
                  dir="ltr"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'تفاصيل الاستفسار' : 'Message'}</label>
                <textarea
                  name="message"
                  rows={3}
                  required
                  defaultValue={
                    lang === 'ar'
                      ? 'مرحباً، أرغب في معرفة السعر النهائي وموعد متاح لمعاينة المعدة.'
                      : 'Hello, I would like to inquire about the final price and inspection schedule.'
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold text-sm"
              >
                {lang === 'ar' ? 'إرسال الاستفسار الآن' : 'Send Inquiry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* D. REPORT LISTING MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 bg-red-600 text-white flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <Flag className="w-5 h-5" />
                {lang === 'ar' ? 'الإبلاغ عن مخالفة في الإعلان' : 'Report Equipment Listing'}
              </h3>
              <button type="button" onClick={() => setShowReportModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const newReport: ReportItem = {
                    id: isSupabaseConfigured ? crypto.randomUUID() : `rep-${Date.now()}`, 
                    equipmentId: showReportModal.id,
                    equipmentTitleAr: showReportModal.titleAr,
                    equipmentTitleEn: showReportModal.titleEn,
                    reporterName: currentUser ? currentUser.nameAr : 'مستخدم المنصة',
                    reason: String(fd.get('reason') || ''),
                    details: String(fd.get('details') || ''),
                    status: 'open',
                    createdAt: new Date().toISOString(),
                };
                if (isSupabaseConfigured) { try { await marketplaceApi.saveReport(newReport, currentUser?.id); } catch (error: any) { triggerToast(error.message || 'تعذر إرسال البلاغ', 'warning'); return; } }
                setReports(prev => [newReport, ...prev]);
                setShowReportModal(null);
                triggerToast(lang === 'ar' ? 'تم إرسال البلاغ لإدارة ALEX TRACK للمراجعة' : 'Report submitted to Admin panel', 'warning');
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'سبب البلاغ' : 'Reason'}</label>
                <select name="reason" className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
                  <option value="مواصفات أو صور غير مطابقة">{lang === 'ar' ? 'مواصفات أو صور غير مطابقة' : 'Inaccurate specs or photos'}</option>
                  <option value="معدة مباعة بالفعل">{lang === 'ar' ? 'معدة مباعة بالفعل' : 'Already sold'}</option>
                  <option value="سعر وهمي أو مضلل">{lang === 'ar' ? 'سعر وهمي أو مضلل' : 'Misleading pricing'}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'تفاصيل إضافية' : 'Details'}</label>
                <textarea name="details" rows={3} required className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-red-600 text-white font-extrabold text-sm">
                {lang === 'ar' ? 'إرسال البلاغ للإدارة' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* E. ADD / EDIT EQUIPMENT FORM MODAL */}
      {showEquipmentFormModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 bg-[#0B192C] text-white flex items-center justify-between">
              <h3 className="font-black text-base">
                {editingEquipment
                  ? (lang === 'ar' ? 'تعديل بيانات المعدة' : 'Edit Equipment Listing')
                  : (lang === 'ar' ? 'إضافة معدة ثقيلة أو زراعية جديدة' : 'Post New Heavy / Agricultural Equipment')}
              </h3>
              <button type="button" onClick={() => setShowEquipmentFormModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                if (isSupabaseConfigured && (!currentUser || currentUser.role !== 'seller')) { triggerToast(lang === 'ar' ? 'يلزم تسجيل الدخول بحساب بائع لإضافة المعدات' : 'Sign in with a seller account to list equipment', 'warning'); return; }
                const fd = new FormData(e.currentTarget);
                const imgInput = String(fd.get('imageUrl') || '').trim();
                const selectedImageFiles = fd.getAll('equipmentImages').filter((item): item is File => item instanceof File && item.size > 0);
                if (isSupabaseConfigured && !selectedImageFiles.length && !imgInput && !editingEquipment?.images.length) {
                  triggerToast(lang === 'ar' ? 'ارفع صورة واحدة على الأقل للمعدة أو أضف رابط صورة قبل النشر' : 'Upload at least one equipment photo or provide an image URL', 'warning');
                  return;
                }
                const listingId = editingEquipment ? editingEquipment.id : (isSupabaseConfigured ? crypto.randomUUID() : `eq-${Date.now()}`);
                const newEq: Equipment = {
                  id: listingId,
                  titleAr: String(fd.get('titleAr') || ''),
                  titleEn: String(fd.get('titleEn') || fd.get('titleAr') || ''),
                  categoryId: String(fd.get('categoryId') || 'excavators'),
                  brand: String(fd.get('brand') || 'Caterpillar'),
                  model: String(fd.get('model') || ''),
                  year: Number(fd.get('year') || 2024),
                  priceEgp: Number(fd.get('priceEgp') || 1000000),
                  listingType: (fd.get('listingType') as ListingType) || 'sale',
                  rentPeriod: 'month',
                  condition: (fd.get('condition') as ConditionType) || 'used',
                  operatingHours: Number(fd.get('operatingHours') || 0),
                  engineSpecsAr: String(fd.get('engineSpecs') || ''),
                  engineSpecsEn: String(fd.get('engineSpecs') || ''),
                  weightTons: Number(fd.get('weightTons') || 15),
                  governorateId: String(fd.get('governorateId') || 'cairo'),
                  descriptionAr: String(fd.get('description') || ''),
                  descriptionEn: String(fd.get('description') || ''),
                  images: imgInput ? [imgInput] : (editingEquipment?.images || (isSupabaseConfigured ? [] : [IMG.excavator1, IMG.bulldozer])),
                  sellerId: currentUser?.id || 'seller-1',
                  sellerNameAr: currentUser?.nameAr || 'شركة النيل للمعدات الثقيلة',
                  sellerNameEn: currentUser?.nameEn || 'Nile Heavy Machinery Co.',
                  sellerVerified: currentUser?.verified ?? true,
                  sellerRating: currentUser?.rating || 4.9,
                  sellerPhone: String(fd.get('phone') || '+201001234567'),
                  sellerWhatsapp: String(fd.get('whatsapp') || '201001234567'),
                  status: editingEquipment ? (editingEquipment.status === 'rejected' ? 'pending' : editingEquipment.status) : (isSupabaseConfigured ? 'pending' : (currentUser?.verified || currentUser?.role === 'admin' ? 'active' : 'pending')),
                  isFeatured: editingEquipment ? editingEquipment.isFeatured : (!isSupabaseConfigured && fd.get('isFeatured') === 'on'),
                  views: editingEquipment ? editingEquipment.views : 1,
                  createdAt: new Date().toISOString(),
                  stockCode: editingEquipment ? editingEquipment.stockCode : `AT-${listingId.slice(0,8).toUpperCase()}`, 
                };

                if (isSupabaseConfigured && currentUser) {
                  try { const saved = await marketplaceApi.saveEquipment(newEq, currentUser.id, selectedImageFiles); newEq.images = saved.images; }
                  catch (error: any) { triggerToast(error.message || 'تعذر حفظ الإعلان في قاعدة البيانات', 'warning'); return; }
                }
                if (editingEquipment) {
                  setEquipmentList(prev => prev.map(item => (item.id === editingEquipment.id ? newEq : item)));
                  triggerToast(lang === 'ar' ? 'تم تحديث بيانات المعدة بنجاح' : 'Equipment listing updated');
                } else {
                  setEquipmentList(prev => [newEq, ...prev]);
                  triggerToast(
                    newEq.status === 'active'
                      ? (lang === 'ar' ? 'تم نشر المعدة في السوق بنجاح!' : 'Equipment published live!')
                      : (lang === 'ar' ? 'تم إرسال الإعلان لمراجعة الإدارة' : 'Submitted for Admin approval')
                  );
                }
                setShowEquipmentFormModal(false);
              }}
              className="p-6 overflow-y-auto grid sm:grid-cols-2 gap-4 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'اسم المعدة (بالعربية) *' : 'Equipment Title (Arabic) *'}</label>
                <input name="titleAr" required defaultValue={editingEquipment?.titleAr} placeholder="مثال: حفار كاتربيلر 320D2 بحالة ممتازة" className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'اسم المعدة (بالإنجليزية)' : 'Equipment Title (English)'}</label>
                <input name="titleEn" defaultValue={editingEquipment?.titleEn} placeholder="e.g., Caterpillar 320D2 Excavator" className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'القسم / الفئة *' : 'Category *'}</label>
                <select name="categoryId" defaultValue={editingEquipment?.categoryId || 'excavators'} className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{lang === 'ar' ? c.nameAr : c.nameEn}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'الماركة المصنعة *' : 'Brand / Manufacturer *'}</label>
                <select name="brand" defaultValue={editingEquipment?.brand || 'Caterpillar'} className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
                  {BRANDS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'الموديل *' : 'Model *'}</label>
                <input name="model" required defaultValue={editingEquipment?.model} placeholder="320D2 / 6155M / WA470" className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'سنة الصنع *' : 'Manufacturing Year *'}</label>
                <input name="year" type="number" required defaultValue={editingEquipment?.year || 2023} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'السعر (ج.م) *' : 'Price (EGP) *'}</label>
                <input name="priceEgp" type="number" required defaultValue={editingEquipment?.priceEgp || 2500000} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'نوع العرض *' : 'Sale or Rent *'}</label>
                <select name="listingType" defaultValue={editingEquipment?.listingType || 'sale'} className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
                  <option value="sale">{lang === 'ar' ? 'للبيع' : 'For Sale'}</option>
                  <option value="rent">{lang === 'ar' ? 'للإيجار' : 'For Rent'}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'الحالة *' : 'Condition *'}</label>
                <select name="condition" defaultValue={editingEquipment?.condition || 'used'} className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
                  <option value="used">{lang === 'ar' ? 'مستعمل' : 'Used'}</option>
                  <option value="new">{lang === 'ar' ? 'جديد زيرو' : 'New'}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'ساعات التشغيل' : 'Operating Hours'}</label>
                <input name="operatingHours" type="number" defaultValue={editingEquipment?.operatingHours || 1500} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'المحافظة *' : 'Governorate *'}</label>
                <select name="governorateId" defaultValue={editingEquipment?.governorateId || 'cairo'} className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold">
                  {GOVERNORATES.filter(g => g.id !== 'all').map(g => (
                    <option key={g.id} value={g.id}>{lang === 'ar' ? g.nameAr : g.nameEn}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'مواصفات المحرك والقدرة' : 'Engine Specs'}</label>
                <input name="engineSpecs" defaultValue={editingEquipment?.engineSpecsAr || 'محرك ديزل تيربو عالي الكفاءة'} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'هاتف التواصل *' : 'Contact Phone *'}</label>
                <input name="phone" required defaultValue={currentUser?.phone || '+201001234567'} dir="ltr" className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold mb-1">{lang === 'ar' ? 'رقم واتساب *' : 'WhatsApp Number *'}</label>
                <input name="whatsapp" required defaultValue="201001234567" dir="ltr" className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">{lang === 'ar' ? 'رفع صور المعدة (حتى 10 ميجابايت للصورة)' : 'Upload equipment photos (max 10 MB each)'}</label>
                <input name="equipmentImages" type="file" accept="image/jpeg,image/png,image/webp" multiple className="w-full p-2.5 rounded-xl border border-slate-300 bg-white" />
                <label className="block font-bold mb-1 mt-2">{lang === 'ar' ? 'أو رابط صورة (اختياري)' : 'Or image URL (optional)'}</label>
                <input name="imageUrl" defaultValue={editingEquipment?.images[0] || ''} placeholder="https://..." dir="ltr" className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">{lang === 'ar' ? 'وصف المعدة والتفاصيل الفنية *' : 'Full Equipment Description *'}</label>
                <textarea name="description" rows={3} required defaultValue={editingEquipment?.descriptionAr} className="w-full p-2.5 rounded-xl border border-slate-300" />
              </div>
              {!isSupabaseConfigured && (
                <label className="sm:col-span-2 flex items-center gap-2 font-bold text-[#F97316] cursor-pointer">
                  <input type="checkbox" name="isFeatured" defaultChecked={editingEquipment?.isFeatured} className="w-4 h-4 accent-[#F97316]" />
                  <span>{lang === 'ar' ? 'تمييز الإعلان في الصفحة الرئيسية (وضع العرض التجريبي)' : 'Boost as Featured Homepage Ad (demo mode)'}</span>
                </label>
              )}

              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEquipmentFormModal(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold">
                  {editingEquipment ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'نشر المعدة الآن' : 'Publish Equipment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* F. AUTHENTICATION MODAL (LOGIN / REGISTER / FORGOT PASSWORD) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#0B192C] text-white flex items-center justify-between">
              <AlexTrackLogo lang={lang} compact />
              <button type="button" onClick={() => setShowAuthModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl font-bold">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 rounded-lg transition ${authMode === 'login' ? 'bg-white text-[#0B192C] shadow' : 'text-slate-600'}`}
                >
                  {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2 rounded-lg transition ${authMode === 'register' ? 'bg-white text-[#0B192C] shadow' : 'text-slate-600'}`}
                >
                  {lang === 'ar' ? 'حساب جديد' : 'Register'}
                </button>
              </div>

              {authMode === 'forgot' ? (
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
                    if (isSupabaseConfigured && supabase) {
                      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
                      if (error) { triggerToast(error.message, 'warning'); return; }
                    } else {
                      triggerToast(lang === 'ar' ? 'استعادة كلمة المرور غير متاحة في وضع العرض التجريبي' : 'Password reset is unavailable in demo mode', 'warning');
                      return;
                    }
                    triggerToast(lang === 'ar' ? 'إذا كان البريد مسجلًا فسيصلك رابط استعادة كلمة المرور' : 'If the email is registered, a password reset link will be sent.');
                    setAuthMode('login');
                  }}
                  className="space-y-3"
                >
                  <p className="text-slate-600">
                    {lang === 'ar' ? 'أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور:' : 'Enter your email to receive a password reset link:'}
                  </p>
                  <input name="email" type="email" required placeholder="name@company.eg" className="w-full p-2.5 rounded-xl border border-slate-300" />
                  <button type="submit" className="w-full py-3 rounded-xl bg-[#F97316] text-white font-extrabold">
                    {lang === 'ar' ? 'إرسال رابط الاستعادة' : 'Send Reset Link'}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    setAuthBusy(true);
                    try {
                    const fd = new FormData(e.currentTarget);
                    const email = String(fd.get('email') || '').trim();
                    const password = String(fd.get('password') || '');
                    if (isSupabaseConfigured && supabase) {
                      if (authMode === 'register') {
                        const role = (fd.get('role') as 'buyer' | 'seller') || 'buyer';
                        const name = String(fd.get('name') || '').trim();
                        const phone = String(fd.get('phone') || '').trim();
                        const { data, error } = await supabase.auth.signUp({
                          email, password,
                          options: { data: { account_role: role, name_ar: name, name_en: name, phone, governorate: 'cairo' } },
                        });
                        if (error) { triggerToast(error.message, 'warning'); return; }
                        setShowAuthModal(false);
                        if (data.session) triggerToast(lang === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully');
                        else triggerToast(lang === 'ar' ? 'تم إنشاء الحساب. راجع بريدك لتأكيد التسجيل قبل تسجيل الدخول.' : 'Account created. Check your email to confirm before signing in.', 'info');
                      } else {
                        const { error } = await supabase.auth.signInWithPassword({ email, password });
                        if (error) { triggerToast(error.message, 'warning'); return; }
                        setShowAuthModal(false);
                        triggerToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
                      }
                      return;
                    }
                    if (authMode === 'register') {
                      const role = (fd.get('role') as 'buyer' | 'seller') || 'buyer';
                      const created: AppUser = {
                        id: `user-${Date.now()}`,
                        nameAr: String(fd.get('name') || 'مستخدم جديد'),
                        nameEn: String(fd.get('name') || 'New Member'),
                        email, phone: String(fd.get('phone') || '+201000000000'), role,
                        governorateId: 'cairo', verified: false, suspended: false, rating: 5.0, joinedDate: new Date().toISOString(),
                      };
                      setUsersList(prev => [...prev, created]); setCurrentUser(created); setShowAuthModal(false);
                      triggerToast(lang === 'ar' ? 'تم إنشاء حساب عرض تجريبي محلي — ليس حساباً حقيقياً' : 'Local demo account created — not a real account', 'warning');
                    } else {
                      setCurrentUser(INITIAL_USERS[0]); setShowAuthModal(false);
                      triggerToast(lang === 'ar' ? 'تم تسجيل الدخول في وضع العرض التجريبي فقط' : 'Signed in to demo mode only', 'warning');
                    }
                    } catch (error: any) {
                      triggerToast(error?.message || 'تعذر تنفيذ تسجيل الدخول', 'warning');
                    } finally {
                      setAuthBusy(false);
                    }
                  }}
                  className="space-y-3"
                >
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block font-bold mb-1">{lang === 'ar' ? 'نوع الحساب' : 'Account Type'}</label>
                        <select name="role" className="w-full p-2.5 rounded-xl border border-slate-300 font-bold">
                          <option value="buyer">{lang === 'ar' ? 'مشتري / مقاول / مزارع' : 'Buyer / Contractor / Farmer'}</option>
                          <option value="seller">{lang === 'ar' ? 'تاجر / وكيل معدات (لدي معدات للبيع)' : 'Seller / Equipment Dealer'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold mb-1">{lang === 'ar' ? 'الاسم أو اسم الشركة' : 'Full Name or Company'}</label>
                        <input name="name" required className="w-full p-2.5 rounded-xl border border-slate-300" />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                        <input name="phone" required placeholder="+20 10..." dir="ltr" className="w-full p-2.5 rounded-xl border border-slate-300" />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block font-bold mb-1">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                    <input name="email" type="email" required placeholder="name@company.com" dir="ltr" className="w-full p-2.5 rounded-xl border border-slate-300" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                    <input name="password" type="password" required minLength={8} placeholder={lang === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'} className="w-full p-2.5 rounded-xl border border-slate-300" />
                  </div>

                  {authMode === 'login' && (
                    <button type="button" onClick={() => setAuthMode('forgot')} className="text-[#F97316] font-bold hover:underline">
                      {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </button>
                  )}

                  <button type="submit" disabled={authBusy} className="w-full py-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white font-extrabold text-sm">
                    {authBusy ? (lang === 'ar' ? 'جارٍ التنفيذ...' : 'Please wait...') : authMode === 'login' ? (lang === 'ar' ? 'دخول' : 'Sign In') : (lang === 'ar' ? 'إنشاء الحساب' : 'Create Account')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* G. SUPABASE BACKEND & RLS SCHEMA MODAL */}
      {showSupabaseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B192C] text-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-[#F97316]" />
                <h3 className="font-black text-base">
                  {lang === 'ar' ? 'هيكل قاعدة بيانات Supabase PostgreSQL & سياسات RLS' : 'Supabase PostgreSQL Schema & Row Level Security'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowSupabaseModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              <p className="text-slate-300">
                {lang === 'ar'
                  ? 'شغّل ملف supabase/schema.sql داخل SQL Editor في مشروع Supabase، ثم أضف VITE_SUPABASE_URL وVITE_SUPABASE_ANON_KEY إلى ملف .env وأعد تشغيل التطبيق. عند ضبط الاتصال تصبح Supabase مصدر البيانات الفعلي:'
                  : 'Run supabase/schema.sql in Supabase SQL Editor, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the app:'}
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(SUPABASE_SQL_SCHEMA);
                    triggerToast(lang === 'ar' ? 'تم نسخ كود SQL بنجاح!' : 'SQL Schema copied to clipboard!');
                  }}
                  className="absolute top-3 end-3 px-3 py-1.5 rounded-lg bg-[#F97316] text-white font-bold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'نسخ SQL' : 'Copy SQL'}
                </button>
                <pre dir="ltr" className="p-4 rounded-2xl bg-slate-950 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed border border-slate-800">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 10. INDUSTRIAL FOOTER                                                */}
      {/* ==================================================================== */}
      <footer className="bg-[#0B192C] text-slate-300 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
          <div className="space-y-4">
            <AlexTrackLogo lang={lang} />
            <p className="text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'ALEX TRACK هي المنصة الرقمية الرائدة في مصر لتجارة وتأجير المعدات الثقيلة، معدات البناء، والجرارات والآلات الزراعية من الوكلاء والتجار المعتمدين.'
                : 'ALEX TRACK is Egypt’s premier industrial marketplace for buying, selling, and renting heavy construction machinery and agricultural equipment.'}
            </p>
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin className="w-4 h-4 text-[#F97316] shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'المقر الرئيسي: التجمع الخامس، القاهرة الجديدة — فرع الإسكندرية: المنطقة الحرة بالعامرية'
                  : 'HQ: Fifth Settlement, New Cairo — Alexandria Branch: Amreya Free Zone'}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-black text-white text-sm mb-4">
              {lang === 'ar' ? 'أقسام المعدات الثقيلة' : 'Heavy Equipment'}
            </h4>
            <ul className="space-y-2">
              {categories.filter(c => c.group === 'heavy').slice(0, 6).map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => applyPresetFilter({ categoryId: c.id })}
                    className="hover:text-[#F97316] transition"
                  >
                    {lang === 'ar' ? c.nameAr : c.nameEn}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-black text-white text-sm mb-4">
              {lang === 'ar' ? 'المعدات الزراعية' : 'Agricultural Machinery'}
            </h4>
            <ul className="space-y-2">
              {categories.filter(c => c.group === 'agricultural').slice(0, 6).map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => applyPresetFilter({ categoryId: c.id })}
                    className="hover:text-[#F97316] transition"
                  >
                    {lang === 'ar' ? c.nameAr : c.nameEn}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-white text-sm mb-4">
              {lang === 'ar' ? 'تواصل مع خدمة العملاء' : 'Support & Dealer Desk'}
            </h4>
            <div className="p-4 rounded-2xl bg-[#132844] border border-slate-700 space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#F97316]" />
                <span dir="ltr">19842 / +20 100 000 0001</span>
              </div>
              <div className="text-slate-400">support@alextrack.eg</div>
              <button
                type="button"
                onClick={() => setShowSupabaseModal(true)}
                className="w-full mt-2 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold transition"
              >
                {lang === 'ar' ? 'عرض هيكل Supabase SQL' : 'View Supabase SQL Schema'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 py-4 text-center text-[11px] text-slate-500">
          © 2026 ALEX TRACK Egypt — {lang === 'ar' ? 'منصتك الموثوقة للمعدات الثقيلة والزراعية. جميع الحقوق محفوظة.' : 'Your Trusted Heavy Equipment Marketplace. All Rights Reserved.'}
        </div>
      </footer>
    </div>
  );
}

export default App;

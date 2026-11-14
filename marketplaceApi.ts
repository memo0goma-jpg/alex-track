import { requireSupabase } from './supabase';

export type DbProfile = {
  id: string; full_name_ar: string; full_name_en: string; email?: string | null;
  role: 'buyer' | 'seller' | 'admin'; company_name?: string | null; phone?: string | null;
  whatsapp?: string | null; governorate?: string | null; avatar_url?: string | null;
  is_verified?: boolean; is_suspended?: boolean; rating?: number; created_at?: string;
};

const profileToApp = (p: any) => ({
  id: p.id, nameAr: p.full_name_ar || 'مستخدم', nameEn: p.full_name_en || 'User',
  email: p.email || '', phone: p.phone || '', role: p.role,
  companyAr: p.company_name || undefined, companyEn: p.company_name || undefined,
  governorateId: p.governorate || 'cairo', verified: Boolean(p.is_verified),
  suspended: Boolean(p.is_suspended), rating: Number(p.rating ?? 5),
  joinedDate: p.created_at ? String(p.created_at).slice(0, 10) : '', avatar: p.avatar_url || undefined,
});

const equipmentToApp = (row: any, seller: any) => ({
  id: row.id, titleAr: row.title_ar, titleEn: row.title_en, categoryId: row.category_id,
  brand: row.brand, model: row.model, year: Number(row.manufacture_year),
  priceEgp: Number(row.price_egp), originalPriceEgp: row.original_price_egp == null ? undefined : Number(row.original_price_egp),
  listingType: row.listing_type, rentPeriod: row.rent_period || undefined, condition: row.condition,
  operatingHours: Number(row.operating_hours || 0), engineSpecsAr: row.engine_specs_ar || '',
  engineSpecsEn: row.engine_specs_en || '', weightTons: Number(row.weight_tons || 0),
  governorateId: row.governorate || 'cairo', descriptionAr: row.description_ar || '', descriptionEn: row.description_en || '',
  images: (row.equipment_images || []).sort((a: any,b: any) => a.sort_order-b.sort_order).map((x: any) => x.image_url),
  sellerId: row.seller_id, sellerNameAr: seller?.full_name_ar || 'بائع ALEX TRACK',
  sellerNameEn: seller?.full_name_en || 'ALEX TRACK Seller', sellerVerified: Boolean(seller?.is_verified),
  sellerRating: Number(seller?.rating ?? 5), sellerPhone: seller?.phone || '', sellerWhatsapp: seller?.whatsapp || '',
  status: row.status, isFeatured: Boolean(row.is_featured), isBestSeller: Boolean(row.is_best_seller),
  views: Number(row.views || 0), createdAt: row.created_at ? String(row.created_at).slice(0,10) : '', stockCode: row.stock_code || '',
});

export async function loadMarketplace(profileId?: string, role?: string) {
  const db = requireSupabase();
  const [categoryRes, equipmentRes, sellerRes, bannerRes, reviewRes] = await Promise.all([
    db.from('categories').select('*').order('sort_order'),
    db.from('equipment').select('*,equipment_images(*)').order('created_at', { ascending: false }),
    db.from('public_seller_profiles').select('*'),
    db.from('banners').select('*').order('sort_order'),
    db.from('reviews').select('*').order('created_at', { ascending: false }),
  ]);
  for (const res of [categoryRes,equipmentRes,sellerRes,bannerRes,reviewRes]) if (res.error) throw res.error;
  const sellers = new Map((sellerRes.data || []).map((p: any) => [p.id,p]));
  const equipment = (equipmentRes.data || []).map((row: any) => equipmentToApp(row,sellers.get(row.seller_id)));
  const equipmentById = new Map(equipment.map((e: any) => [e.id,e]));
  const categories = (categoryRes.data || []).map((c: any) => ({
    id:c.id, group:c.group_type, nameAr:c.name_ar, nameEn:c.name_en, iconKey:c.icon_key || '', active:c.is_active,
  }));
  const banners = (bannerRes.data || []).map((b: any) => ({
    id:b.id,badgeAr:b.badge_ar,badgeEn:b.badge_en,titleAr:b.title_ar,titleEn:b.title_en,
    subtitleAr:b.subtitle_ar,subtitleEn:b.subtitle_en,ctaAr:b.cta_ar,ctaEn:b.cta_en,
    filterPreset:b.filter_preset || {},image:b.image_url,active:b.is_active,
  }));
  const reviews = (reviewRes.data || []).map((r: any) => ({
    id:r.id,equipmentId:r.equipment_id,userName:r.reviewer_name,rating:Number(r.rating),comment:r.comment,
    date:r.created_at ? String(r.created_at).slice(0,10) : '',
  }));

  let users: any[] = [];
  let inquiries: any[] = [];
  let reports: any[] = [];
  if (profileId && role === 'admin') {
    const [profilesRes, inquiriesRes, reportsRes] = await Promise.all([
      db.from('profiles').select('*').order('created_at',{ascending:false}),
      db.from('inquiries').select('*').order('created_at',{ascending:false}),
      db.from('reports').select('*').order('created_at',{ascending:false}),
    ]);
    for (const res of [profilesRes,inquiriesRes,reportsRes]) if (res.error) throw res.error;
    users = (profilesRes.data || []).map(profileToApp);
    inquiries = (inquiriesRes.data || []).map((i: any) => inquiryToApp(i,equipmentById));
    reports = (reportsRes.data || []).map((r: any) => reportToApp(r,equipmentById));
  } else if (profileId && role === 'seller') {
    const { data,error } = await db.from('inquiries').select('*').eq('seller_id',profileId).order('created_at',{ascending:false});
    if (error) throw error;
    inquiries = (data || []).map((i: any) => inquiryToApp(i,equipmentById));
  } else if (profileId && role === 'buyer') {
    const { data,error } = await db.from('inquiries').select('*').eq('buyer_id',profileId).order('created_at',{ascending:false});
    if (error) throw error;
    inquiries = (data || []).map((i: any) => inquiryToApp(i,equipmentById));
  }
  return { categories,equipment,banners,reviews,users,inquiries,reports };
}

function inquiryToApp(i: any, equipmentById: Map<any,any>) {
  const eq: any = equipmentById.get(i.equipment_id);
  return { id:i.id,equipmentId:i.equipment_id,equipmentTitleAr:eq?.titleAr || '',equipmentTitleEn:eq?.titleEn || '',
    sellerId:i.seller_id,buyerName:i.buyer_name,buyerPhone:i.buyer_phone,message:i.message,reply:i.reply || undefined,
    createdAt:i.created_at ? String(i.created_at).replace('T',' ').slice(0,16) : '',read:Boolean(i.is_read) };
}
function reportToApp(r: any, equipmentById: Map<any,any>) {
  const eq: any = equipmentById.get(r.equipment_id);
  return { id:r.id,equipmentId:r.equipment_id,equipmentTitleAr:eq?.titleAr || '',equipmentTitleEn:eq?.titleEn || '',
    reporterName:r.reporter_name || 'زائر المنصة',reason:r.reason,details:r.details,status:r.status,
    createdAt:r.created_at ? String(r.created_at).replace('T',' ').slice(0,16) : '' };
}

export async function getProfile(userId: string) {
  const db = requireSupabase();
  const { data,error } = await db.from('profiles').select('*').eq('id',userId).single();
  if (error) throw error;
  return profileToApp(data);
}

export async function saveEquipment(equipment: any, sellerId: string, files: File[] = []) {
  const db = requireSupabase();
  const id = equipment.id || crypto.randomUUID();
  const row = {
    id,seller_id:sellerId,category_id:equipment.categoryId,title_ar:equipment.titleAr,title_en:equipment.titleEn,
    brand:equipment.brand,model:equipment.model,manufacture_year:equipment.year,price_egp:equipment.priceEgp,
    original_price_egp:equipment.originalPriceEgp ?? null,listing_type:equipment.listingType,rent_period:equipment.rentPeriod ?? null,
    condition:equipment.condition,operating_hours:equipment.operatingHours,engine_specs_ar:equipment.engineSpecsAr,
    engine_specs_en:equipment.engineSpecsEn,weight_tons:equipment.weightTons,governorate:equipment.governorateId,
    description_ar:equipment.descriptionAr,description_en:equipment.descriptionEn,status:equipment.status,
    stock_code:equipment.stockCode,
  };
  const { data: existing, error: lookupError } = await db.from('equipment').select('id').eq('id',id).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    const { id: _id, seller_id: _sellerId, ...editableFields } = row;
    const { error:updateError } = await db.from('equipment').update(editableFields).eq('id',id);
    if (updateError) throw updateError;
  } else {
    const { error:insertError } = await db.from('equipment').insert({
      ...row,is_featured:false,is_best_seller:false,views:0,
    });
    if (insertError) throw insertError;
  }

  const { data: oldImages,error:oldImagesError } = await db.from('equipment_images').select('id,image_url,object_path,sort_order').eq('equipment_id',id).order('sort_order');
  if (oldImagesError) throw oldImagesError;
  let nextImages: { image_url:string; object_path?:string | null }[] | null = null;
  if (files.length) {
    const uploaded: { image_url:string; object_path:string }[] = [];
    for (const file of files) {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error(`صيغة الصورة ${file.name} غير مدعومة`);
      if (file.size > 10 * 1024 * 1024) throw new Error(`الصورة ${file.name} أكبر من 10 ميجابايت`);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
      const path = `${sellerId}/${id}/${crypto.randomUUID()}-${safeName}`;
      const { error:uploadError } = await db.storage.from('equipment-images').upload(path,file,{upsert:false,contentType:file.type});
      if (uploadError) throw uploadError;
      const { data } = db.storage.from('equipment-images').getPublicUrl(path);
      uploaded.push({ image_url:data.publicUrl,object_path:path });
    }
    nextImages = uploaded;
  } else {
    const requestedUrls = (equipment.images || []).filter((url: string) => Boolean(url));
    const existingUrls = (oldImages || []).map((item: any) => item.image_url);
    if (JSON.stringify(requestedUrls) !== JSON.stringify(existingUrls)) {
      nextImages = requestedUrls.map((image_url: string) => ({ image_url,object_path:null }));
    }
  }

  if (nextImages) {
    const { error:deleteImagesError } = await db.from('equipment_images').delete().eq('equipment_id',id);
    if (deleteImagesError) throw deleteImagesError;
    if (nextImages.length) {
      const { error:imageError } = await db.from('equipment_images').insert(nextImages.map((img,index) => ({
        equipment_id:id,image_url:img.image_url,object_path:img.object_path || null,sort_order:index,
      })));
      if (imageError) throw imageError;
    }
    const oldPaths = (oldImages || []).map((img: any) => img.object_path).filter(Boolean);
    if (oldPaths.length) {
      const { error:removeError } = await db.storage.from('equipment-images').remove(oldPaths);
      if (removeError) throw removeError;
    }
  }
  const finalImages = nextImages ? nextImages.map(image => image.image_url) : (oldImages || []).map((image: any) => image.image_url);
  return { id, images: finalImages };
}

export async function updateEquipment(id: string, values: Record<string,unknown>) {
  const { error } = await requireSupabase().from('equipment').update(values).eq('id',id);
  if (error) throw error;
}
export async function deleteEquipment(id: string) {
  const db = requireSupabase();
  const { data:images, error:readError } = await db.from('equipment_images').select('object_path').eq('equipment_id',id);
  if (readError) throw readError;
  const { error } = await db.from('equipment').delete().eq('id',id);
  if (error) throw error;
  const paths = (images || []).map((image: any) => image.object_path).filter(Boolean);
  if (paths.length) {
    const { error:cleanupError } = await db.storage.from('equipment-images').remove(paths);
    if (cleanupError) console.warn('Equipment image cleanup failed:', cleanupError);
  }
}
export async function incrementViews(id: string) {
  const { error } = await requireSupabase().rpc('increment_equipment_view',{p_equipment_id:id});
  if (error) throw error;
}
export async function saveInquiry(inquiry: any, buyerId?: string) {
  const { error } = await requireSupabase().from('inquiries').insert({
    id:inquiry.id, equipment_id:inquiry.equipmentId,seller_id:inquiry.sellerId,buyer_id:buyerId || null,
    buyer_name:inquiry.buyerName,buyer_phone:inquiry.buyerPhone,message:inquiry.message,
  });
  if (error) throw error;
}
export async function replyInquiry(id: string, reply: string) {
  const { error } = await requireSupabase().from('inquiries').update({reply,is_read:true}).eq('id',id);
  if (error) throw error;
}
export async function saveReview(review: any, buyerId: string) {
  const { data,error } = await requireSupabase().from('reviews').insert({
    id:review.id, equipment_id:review.equipmentId,buyer_id:buyerId,reviewer_name:review.userName,rating:review.rating,comment:review.comment,
  }).select('*').single();
  if (error) throw error;
  return data;
}
export async function saveReport(report: any, reporterId?: string) {
  const { error } = await requireSupabase().from('reports').insert({
    id:report.id, equipment_id:report.equipmentId,reporter_id:reporterId || null,reporter_name:report.reporterName,
    reason:report.reason,details:report.details,status:'open',
  });
  if (error) throw error;
}
export async function updateReport(id: string, status: string) {
  const { error } = await requireSupabase().from('reports').update({status}).eq('id',id);
  if (error) throw error;
}
export async function updateBanner(id: string, isActive: boolean) {
  const { error } = await requireSupabase().from('banners').update({is_active:isActive}).eq('id',id);
  if (error) throw error;
}
export async function updateProfile(profile: any) {
  const { error } = await requireSupabase().from('profiles').update({
    full_name_ar:profile.nameAr,full_name_en:profile.nameEn,phone:profile.phone,governorate:profile.governorateId,
  }).eq('id',profile.id);
  if (error) throw error;
}
export async function updateUserModeration(id: string, values: { is_verified?:boolean; is_suspended?:boolean }) {
  const { error } = await requireSupabase().from('profiles').update(values).eq('id',id);
  if (error) throw error;
}
export async function saveFavorite(userId: string, equipmentId: string, enabled: boolean) {
  const db = requireSupabase();
  const result = enabled
    ? await db.from('favorites').upsert({user_id:userId,equipment_id:equipmentId})
    : await db.from('favorites').delete().eq('user_id',userId).eq('equipment_id',equipmentId);
  if (result.error) throw result.error;
}
export async function loadFavorites(userId: string) {
  const { data,error } = await requireSupabase().from('favorites').select('equipment_id').eq('user_id',userId);
  if (error) throw error;
  return (data || []).map((row: any) => row.equipment_id as string);
}

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AppState, Company, Deal, Listing, Requirement, Offer, Message, StatusEvent } from "@/services/types";

const COMPANY = "id,name,industry,cityId:city_id,roles,description,phone,foundedYear:founded_year,verification_status,gstin,verification_document,verification_submitted_at,notifications_seen_at,createdAt:created_at";
const LISTING = "id,companyId:company_id,materialId:material_id,title,description,quantityKg:quantity_kg,unit,pricePerKg:price_per_kg,cityId:city_id,quality,moisturePct:moisture_pct,contamination,availability,image_path,status,createdAt:created_at";
const REQUIREMENT = "id,companyId:company_id,materialId:material_id,quantityKg:quantity_kg,maxBudgetPerKg:max_budget_per_kg,cityId:city_id,maxDistanceKm:max_distance_km,minQuality:min_quality,maxContamination:max_contamination,maxMoisturePct:max_moisture_pct,delivery,notes,status,createdAt:created_at";
const DEAL = "id,listingId:listing_id,requirementId:requirement_id,buyerId:buyer_id,sellerId:seller_id,status,createdAt:created_at,updatedAt:updated_at,offers(id,byCompanyId:by_company_id,quantityKg:quantity_kg,pricePerKg:price_per_kg,note,createdAt:created_at),messages(id,companyId:company_id,text:body,createdAt:created_at),history:deal_events(status,byCompanyId:company_id,at:created_at)";

export async function loadPlatform(client: SupabaseClient, user: User): Promise<AppState> {
  const membership = await client.from("memberships").select("company_id").eq("user_id", user.id).maybeSingle();
  if (membership.error) throw new Error("Database setup is incomplete. Apply schema.sql and the shared-platform migration.");
  let companyId: string | undefined = membership.data?.company_id;
  if (!companyId) {
    const meta = user.user_metadata;
    if (!meta.companyName) throw new Error("This account has no company profile. Register a company account first.");
    const created = await client.rpc("app_mutate", { action: "createCompany", p: {
      companyName: meta.companyName, industry: meta.industry, cityId: meta.cityId, phone: meta.phone, roles: meta.roles,
    } });
    if (created.error) throw new Error(`Company setup failed: ${created.error.message}`);
    companyId = created.data.id;
  }
  const results = await Promise.all([
    client.from("companies").select(COMPANY).order("created_at").limit(2001),
    client.from("listings").select(LISTING).order("created_at", { ascending: false }).limit(2001),
    client.from("requirements").select(REQUIREMENT).order("created_at", { ascending: false }).limit(2001),
    client.from("deals").select(DEAL).order("created_at", { ascending: false }).limit(2001),
    client.from("saved_listings").select("listing_id").eq("company_id", companyId).limit(2001),
  ]);
  for (const result of results) {
    if (result.error) throw new Error("Could not load shared data. Check the database migration and connection, then retry.");
    if (result.data && result.data.length > 2000) throw new Error("This workspace exceeds the current 2,000-record view limit. Contact the administrator.");
  }
  type CompanyRow = Company & { verification_status: string; gstin: string | null; verification_document: string | null; verification_submitted_at: string | null; notifications_seen_at: string | null };
  const companies = (results[0].data as unknown as CompanyRow[]).map((row): Company => ({
    id: row.id, name: row.name, industry: row.industry, cityId: row.cityId, roles: row.roles, description: row.description,
    email: row.id === companyId ? user.email ?? "" : "", phone: row.phone, foundedYear: row.foundedYear ?? new Date(row.createdAt).getFullYear(),
    verified: row.verification_status === "verified", reviews: [], isDemo: false, createdAt: row.createdAt,
    ...(row.verification_submitted_at && row.gstin ? { verification: { status: row.verification_status as "pending" | "verified" | "rejected", gstin: row.gstin, documentName: row.verification_document ?? "Submitted", submittedAt: row.verification_submitted_at, reviewedAt: null } } : {}),
  }));
  type ListingRow = Listing & { image_path: string | null };
  const listings = (results[1].data as unknown as ListingRow[]).map((row): Listing => {
    const { image_path, ...listing } = row;
    return { ...listing, quantity: row.unit === "tonne" ? row.quantityKg / 1000 : row.quantityKg,
      imageDataUrl: image_path ? client.storage.from("listing-images").getPublicUrl(image_path).data.publicUrl : null };
  });
  const deals = (results[3].data as unknown as Deal[]).map((d) => ({ ...d,
    offers: [...d.offers].sort((a: Offer,b: Offer) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
    messages: [...d.messages].sort((a: Message,b: Message) => a.createdAt.localeCompare(b.createdAt)),
    history: [...d.history].sort((a: StatusEvent,b: StatusEvent) => a.at.localeCompare(b.at)),
  }));
  const own = (results[0].data as unknown as CompanyRow[]).find((c) => c.id === companyId);
  return { schemaVersion: 2, session: { companyId: companyId! }, accounts: [], companies, listings,
    requirements: results[2].data as unknown as Requirement[], deals,
    savedListingIds: { [companyId!]: (results[4].data as unknown as { listing_id: string }[]).map((s) => s.listing_id) },
    notificationsSeenAt: own?.notifications_seen_at ? { [companyId!]: own.notifications_seen_at } : {},
  };
}

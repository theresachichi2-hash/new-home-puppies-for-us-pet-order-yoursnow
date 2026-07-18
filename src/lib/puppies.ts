import { supabase } from "@/integrations/supabase/client";

export type MediaItem = { type: "image" | "video"; url: string };

export type Puppy = {
  id: string;
  name: string;
  breed: string;
  gender: "Male" | "Female";
  age_weeks: number;
  color: string | null;
  price: number;
  description: string | null;
  image_url: string | null;
  media: MediaItem[];
  available: boolean;
  created_at: string;
  seller_name: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  seller_notes: string | null;
  // Extended info
  size: string | null;
  generation: string | null;
  weight_min_lbs: number | null;
  weight_max_lbs: number | null;
  date_of_birth: string | null;
  vet_checked: boolean;
  vaccines_status: string | null;
  view_count: number;
  free_delivery: boolean;
};

const PUBLIC_COLS =
  "id,name,breed,gender,age_weeks,color,price,description,image_url,media,available,created_at,size,generation,weight_min_lbs,weight_max_lbs,date_of_birth,vet_checked,vaccines_status,view_count,free_delivery";

function normalize(row: Record<string, unknown>): Puppy {
  return {
    ...row,
    media: Array.isArray(row.media) ? (row.media as MediaItem[]) : [],
    seller_name: (row.seller_name as string | null) ?? null,
    seller_phone: (row.seller_phone as string | null) ?? null,
    seller_email: (row.seller_email as string | null) ?? null,
    seller_notes: (row.seller_notes as string | null) ?? null,
    size: (row.size as string | null) ?? null,
    generation: (row.generation as string | null) ?? null,
    weight_min_lbs: (row.weight_min_lbs as number | null) ?? null,
    weight_max_lbs: (row.weight_max_lbs as number | null) ?? null,
    date_of_birth: (row.date_of_birth as string | null) ?? null,
    vet_checked: !!row.vet_checked,
    vaccines_status: (row.vaccines_status as string | null) ?? null,
    view_count: (row.view_count as number | null) ?? 0,
    free_delivery: !!row.free_delivery,
  } as Puppy;
}

export async function fetchPuppies(): Promise<Puppy[]> {
  const { data, error } = await supabase
    .from("puppies")
    .select(PUBLIC_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
}

export async function fetchPuppy(id: string): Promise<Puppy | null> {
  const { data, error } = await supabase
    .from("puppies")
    .select(PUBLIC_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data as Record<string, unknown>) : null;
}

export async function fetchPuppiesAdmin(): Promise<Puppy[]> {
  const { data, error } = await supabase
    .from("puppies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
}

export type PaymentSettings = {
  paypal_email: string | null;
  paypal_me_link: string | null;
  bitcoin_address: string | null;
};

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from("payment_settings")
    .select("paypal_email, paypal_me_link, bitcoin_address")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    return { paypal_email: "", paypal_me_link: "", bitcoin_address: "" };
  }
  return (data ?? { paypal_email: "", paypal_me_link: "", bitcoin_address: "" }) as PaymentSettings;
}

// Reservation fee = 25% of price
export function reservationAmount(price: number): number {
  return Math.round(price * 0.25 * 100) / 100;
}

// ---------------- Reviews ----------------

export type Review = {
  id: string;
  puppy_id: string | null;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
};

export async function fetchReviews(limit = 800): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, puppy_id, author_name, rating, content, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function submitReview(input: {
  author_name: string;
  rating: number;
  content: string;
  puppy_id?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("reviews").insert({
    author_name: input.author_name.trim().slice(0, 80),
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    content: input.content.trim().slice(0, 2000),
    puppy_id: input.puppy_id ?? null,
  });
  if (error) throw error;
}

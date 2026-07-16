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
};

export async function fetchPuppies(): Promise<Puppy[]> {
  const { data, error } = await supabase
    .from("puppies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Puppy[];
}

export async function fetchPuppy(id: string): Promise<Puppy | null> {
  const { data, error } = await supabase.from("puppies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Puppy | null;
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
  if (error) throw error;
  return (data ?? { paypal_email: "", paypal_me_link: "", bitcoin_address: "" }) as PaymentSettings;
}

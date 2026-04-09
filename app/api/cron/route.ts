import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const now = new Date();
    // বাংলাদেশের সময় অনুযায়ী বর্তমান সময় (HH:mm)
    const currentTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    console.log(`চেক করা হচ্ছে: ${currentTime}`);

    // সুপাবেজ ডাটাবেজ থেকে সময় অনুযায়ী ওষুধ খোঁজা
    // .select('*') যোগ করা হয়েছে 'eq' এরর ঠিক করতে
    const { data: medicines, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('time', currentTime);

    if (error) throw error;

    if (medicines && medicines.length > 0) {
      // 'm: any' দিয়ে ম্যাপের এরর ঠিক করা হয়েছে
      const medicineNames = medicines.map((m: any) => m.name).join(', ');
      console.log(`ওষুধ পাওয়া গেছে: ${medicineNames}`);
      
      // এখানে আমরা পরে সার্ভার-সাইড মেইল পাঠানোর লজিক যোগ করতে পারবো
    }

    return NextResponse.json({ 
      success: true, 
      time: currentTime, 
      found: medicines?.length || 0 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
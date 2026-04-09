import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const now = new Date();
    
    // বাংলাদেশের সময় অনুযায়ী বর্তমান সময় (HH:mm) বের করা
    const currentTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    console.log(`সার্ভার চেক করছে: ${currentTime}`);

    // ১. ডাটাবেজ থেকে এই সময়ের ওষুধগুলো খুঁজে বের করা
    const { data: medicines, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('time', currentTime);

    if (error) throw error;

    // ২. যদি কোনো ওষুধ পাওয়া যায়
    if (medicines && medicines.length > 0) {
      const medicineNames = medicines.map((m: any) => m.name).join(', ');
      console.log(`ওষুধ পাওয়া গেছে: ${medicineNames}`);
      
      // এখানে ভবিষ্যতে আমরা সার্ভার-সাইড মেইল পাঠানোর লজিক যোগ করতে পারবো।
      // আপাতত এটি ডাটাবেজ চেক সাকসেসফুল কি না তা নিশ্চিত করছে।
    }

    return NextResponse.json({ 
      success: true, 
      time: currentTime, 
      found: medicines?.length || 0 
    });

  } catch (error: any) {
    console.error('Cron Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}
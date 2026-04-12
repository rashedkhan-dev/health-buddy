'use client' 
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import emailjs from '@emailjs/browser'
import { Pill, Plus, Clock, Loader2, Trash2, Upload, Image as ImageIcon, Mail, Bell } from 'lucide-react'

export default function Home() {
  const [medicines, setMedicines] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newDosage, setNewDosage] = useState('')

  // নোটিফিকেশন ট্র্যাক করার জন্য স্টেট (একই ওষুধ যেন বারবার না যায়)
  const [sentNotifications, setSentNotifications] = useState<string[]>([]);

  // আপনার EmailJS তথ্যসমূহ
  const EMAILJS_SERVICE_ID = "service_anwtz5i";
  const EMAILJS_TEMPLATE_ID = "template_vrtrjwp";
  const EMAILJS_PUBLIC_KEY = "Nhgg6ussab730atZf";

  useEffect(() => {
    fetchMedicines()
    fetchPrescriptions()
    
    if ("Notification" in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, [])

  const sendEmailReminder = (name: string, dosage: string) => {
    const templateParams = {
      medicine_name: name,
      dosage: dosage,
      name: "Health Buddy",
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
      .then((result) => {
        console.log('ইমেইল সফলভাবে পাঠানো হয়েছে!', result.status);
      })
      .catch((error) => {
        console.error('ইমেইল পাঠাতে ব্যর্থ:', error);
      });
  };

  const sendNotification = (name: string, dosage: string) => {
    // ১. ব্রাউজার নোটিফিকেশন
    if (Notification.permission === 'granted') {
      new Notification("ওষুধ খাওয়ার সময় হয়েছে!", {
        body: `${name} খাওয়ার সময় হয়েছে (${dosage})`,
      });
    }
    // ২. স্ক্রিন অ্যালার্ট
    alert(`রিমাইন্ডার: আপনার ${name} (${dosage}) খাওয়ার সময় হয়েছে!`);
    // ৩. ইমেইল পাঠানো
    sendEmailReminder(name, dosage);
  }

  // শক্তিশালী অটোমেটিক রিমাইন্ডার লজিক
  useEffect(() => {
    console.log("রিমাইন্ডার সিস্টেম সক্রিয় আছে...");

    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                          now.getMinutes().toString().padStart(2, '0');

      medicines.forEach(med => {
        // সময় মিললে এবং এই মিনিটে আগে পাঠানো না হয়ে থাকলে
        if (med.time === currentTime && !sentNotifications.includes(`${med.name}-${currentTime}`)) {
          console.log(`অ্যাকশন শুরু: ${med.name} এর রিমাইন্ডার পাঠানো হচ্ছে...`);
          sendNotification(med.name, med.dosage);
          // মনে রাখা যে এই রিমাইন্ডারটি পাঠানো হয়েছে
          setSentNotifications(prev => [...prev, `${med.name}-${currentTime}`]);
        }
      });

      // প্রতি ঘণ্টা শেষে মেমোরি ক্লিন করা
      if (now.getMinutes() === 0 && now.getSeconds() < 11) {
        setSentNotifications([]);
      }

    }, 10000); // ১০ সেকেন্ড পর পর চেক করবে

    return () => clearInterval(interval);
  }, [medicines, sentNotifications]);

  // ডাটাবেজ ফাংশনসমূহ
  async function fetchMedicines() {
    setLoading(true)
    const { data } = await supabase.from('medicines').select('*').order('time', { ascending: true })
    if (data) setMedicines(data)
    setLoading(false)
  }

  async function fetchPrescriptions() {
    const { data } = await supabase.from('prescriptions').select('*').order('created_at', { ascending: false })
    if (data) setPrescriptions(data)
  }

  const addMedicine = async () => {
    if (!newName || !newTime) return alert('ওষুধের নাম এবং সময় দিন!')
    const { error } = await supabase.from('medicines').insert([{ name: newName, time: newTime, dosage: newDosage }])
    if (!error) {
      setNewName(''); setNewTime(''); setNewDosage('');
      fetchMedicines();
    }
  }

  const deleteMedicine = async (id: number) => {
    if (!confirm("ডিলিট করতে চান?")) return;
    await supabase.from('medicines').delete().eq('id', id);
    fetchMedicines();
  }

  const uploadPrescription = async (event: any) => {
    const file = event.target.files[0]
    if (!file) return
    setLoading(true)
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`
    let { error: uploadError } = await supabase.storage.from('prescriptions').upload(fileName, file)
    if (uploadError) { alert('আপলোড ব্যর্থ!'); setLoading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('prescriptions').getPublicUrl(fileName)
    await supabase.from('prescriptions').insert([{ image_url: publicUrl }])
    fetchPrescriptions();
    setLoading(false);
  }

  const deletePrescription = async (id: number, imageUrl: string) => {
    if (!confirm("ডিলিট করতে চান?")) return;
    const fileName = imageUrl.split('/').pop();
    if (fileName) await supabase.storage.from('prescriptions').remove([fileName]);
    await supabase.from('prescriptions').delete().eq('id', id);
    fetchPrescriptions();
  }

  return (
    <div className="min-h-screen bg-blue-50 text-black pb-10 font-sans">
      <nav className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10 border-b">
        <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2"><Pill /> Health Buddy</h1>
        <div className="flex items-center gap-3">
           <Mail size={18} className="text-green-500 animate-pulse" />
           <button onClick={() => sendNotification("টেস্ট ওষুধ", "১টি")} className="p-2 bg-blue-50 rounded-full text-blue-600 hover:bg-blue-100 transition">
             <Bell size={20} />
           </button>
        </div>
      </nav>

      <main className="p-6 max-w-md mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">আজকের রিমাইন্ডার</h2>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : medicines.length === 0 ? (
            <p className="text-gray-400 text-sm text-center">কোনো ওষুধ নেই।</p>
          ) : (
            medicines.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-3 border shadow-sm">
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-400" size={18} />
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.time} | {item.dosage}</p>
                  </div>
                </div>
                <button onClick={() => deleteMedicine(item.id)} className="text-red-300 hover:text-red-500 transition"><Trash2 size={18} /></button>
              </div>
            ))
          )}
        </div>

        {/* গ্যালারি */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2"><ImageIcon size={20} className="text-blue-500" /> প্রেসক্রিপশন</h2>
          <div className="grid grid-cols-2 gap-3">
            {prescriptions.map((p) => (
              <div key={p.id} className="relative group">
                <a href={p.image_url} target="_blank" rel="noreferrer">
                  <img src={p.image_url} alt="p" className="w-full h-24 object-cover rounded-xl border transition group-hover:opacity-90" />
                </a>
                <button onClick={() => deletePrescription(p.id, p.image_url)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-lg"><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 font-sans">নতুন ওষুধ যোগ করুন</h2>
          <div className="flex flex-col gap-3">
            <input type="text" placeholder="নাম" className="p-3 border rounded-xl outline-none focus:border-blue-400 bg-white" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input type="time" className="p-3 border rounded-xl outline-none focus:border-blue-400 bg-white" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            <input type="text" placeholder="পরিমাণ" className="p-3 border rounded-xl outline-none focus:border-blue-400 bg-white" value={newDosage} onChange={(e) => setNewDosage(e.target.value)} />
            <button onClick={addMedicine} className="bg-blue-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition"><Plus /> সেভ করুন</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 text-center">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-50">
            <Upload className="text-blue-500 mb-2" size={30} />
            <p className="text-sm text-gray-500">প্রেসক্রিপশন</p>
            <input type="file" className="hidden" accept="image/*" onChange={uploadPrescription} />
          </label>
        </div>
      </main>
    </div>
  )
}
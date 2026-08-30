
// OneSignal Init
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: "06265525-0c5a-43c1-8825-2e245ec16a05",
    notifyButton: { enable: true },
    allowLocalhostAsSecureOrigin: true,
  });
});

const firebaseConfig = {
  apiKey: "AIzaSyB3WLRLY5ZKn0TDG55uu7frulpEmj_tze0",
  authDomain: "eyada-tabiei.firebaseapp.com",
  projectId: "eyada-tabiei",
  storageBucket: "eyada-tabiei.firebasestorage.app",
  messagingSenderId: "58203582971",
  appId: "1:58203582971:web:6fc58bb0c5573c38f35b5e"
};
let db=null;
try{ if(!firebase.apps.length) firebase.initializeApp(firebaseConfig); db=firebase.firestore(); }catch(e){ console.error(e); }

const { useState, useEffect, useRef } = React;
const daysMap = { 6: "السبت", 0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة (عطلة)" };
const daysOrder = [6, 0, 1, 2, 3, 4];
const injuryTypes = ["خشونة ركبة","خلع ولادي", "انزلاق غضروفي", "جلطة", "قطع رباط", "كسر", "تأهيل بعد عملية", "شد عضلي", "أخرى"];
function formatToWhatsApp(phone){ if(!phone) return "#"; let p=phone.replace(/\D/g,""); if(p.startsWith("0")) p="964"+p.substring(1); if(!p.startsWith("964")) p="964"+p; return `https://wa.me/${p}`; }
function timeToMinutes(t){ const [h,m]=t.split(":").map(Number); return h*60+m; }

function App(){
  const [isLoggedIn,setIsLoggedIn]=useState(false);
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [tab,setTab]=useState("therapists");
  const [alert,setAlert]=useState(null);
  const [loading,setLoading]=useState(true);
  const [schedules,setSchedules]=useState([]);
  const [patients,setPatients]=useState([]);
  const [therapists,setTherapists]=useState([]);
  const [newPatient,setNewPatient]=useState({name:"",phone:"",gender:"ذكر",age_value:"",age_unit:"سنة",address:"",injury_type:"",therapist_name:""});
  const [selectedDays,setSelectedDays]=useState([]);
  const [sessionTimes,setSessionTimes]=useState({6:"09:00",0:"09:00",1:"09:00",2:"09:00",3:"09:00",4:"09:00"});
  const [newTherapist,setNewTherapist]=useState({name:"",phone:"",specialization:"",image:"",availableDays:[]});
  const [editingTherapist,setEditingTherapist]=useState(null);
  const [editTherapistForm,setEditTherapistForm]=useState({name:"",phone:"",specialization:"",image:"",availableDays:[]});
  const [searchTherapist,setSearchTherapist]=useState("");
  const [editingPatient,setEditingPatient]=useState(null);
  const [editForm,setEditForm]=useState({name:"",phone:"",age_value:"",age_unit:"سنة",address:"",injury_type:"",gender:"ذكر",therapistName:""});
  const [notifTitle,setNotifTitle]=useState("");
  const [notifMsg,setNotifMsg]=useState("");
  const [oneSignalRestKey,setOneSignalRestKey]=useState(localStorage.getItem("onesignal_rest_key")||"");
  const [searchPatient,setSearchPatient]=useState("");
  const alertRef=useRef(null);

  useEffect(()=>{ try{ const saved=localStorage.getItem("eyada_clinic_login"); if(saved){ const d=JSON.parse(saved); if(d.code==="0772"){ setIsLoggedIn(true); setCode(d.code); } } }catch(e){} },[]);
  const handleLogin=()=>{ if(code==="0772"){ setIsLoggedIn(true); localStorage.setItem("eyada_clinic_login", JSON.stringify({code,timestamp:Date.now()})); setError(""); } else setError("كود الدخول غير صحيح"); };
  const handleLogout=()=>{ setIsLoggedIn(false); localStorage.removeItem("eyada_clinic_login"); setCode(""); };
  const showAlert=(msg,type="info")=>{ setAlert({msg,type}); if(alertRef.current) clearTimeout(alertRef.current); alertRef.current=setTimeout(()=>setAlert(null),6000); };
  const fetchData=async()=>{ setLoading(true); try{ const [sSnap,pSnap,tSnap]=await Promise.all([db.collection("schedules").get(),db.collection("patients").get(),db.collection("therapists").get()]); setSchedules(sSnap.docs.map(d=>({id:d.id,...d.data()}))); setPatients(pSnap.docs.map(d=>({id:d.id,...d.data()}))); setTherapists(tSnap.docs.map(d=>({id:d.id,...d.data()}))); }catch(err){ showAlert("خطأ جلب البيانات","error"); }finally{ setLoading(false); } };
  useEffect(()=>{ if(isLoggedIn&&db) fetchData(); },[isLoggedIn]);

  const handleTherapistImage=(e, isEdit=false)=>{
    const file=e.target.files[0];
    if(!file) return;
    if(file.size>800000){ showAlert("الصورة كبيرة - اختر اقل من 800KB","error"); return; }
    const reader=new FileReader();
    reader.onload=(ev)=>{
      if(isEdit) setEditTherapistForm(prev=>({...prev,image:ev.target.result}));
      else setNewTherapist(prev=>({...prev,image:ev.target.result}));
    };
    reader.readAsDataURL(file);
  };

  const handleAddTherapist=async()=>{
    if(!newTherapist.name){ showAlert("اسم المعالج مطلوب","error"); return; }
    try{
      await db.collection("therapists").add({...newTherapist, createdAt:new Date()});
      showAlert(`✅ تم اضافة ${newTherapist.name}`,"success");
      setNewTherapist({name:"",phone:"",specialization:"",image:"",availableDays:[]});
      fetchData();
    }catch(e){ showAlert("خطأ بالاضافة","error"); }
  };
  const openEditTherapist=(t)=>{
    setEditingTherapist(t);
    setEditTherapistForm({name:t.name||"",phone:t.phone||"",specialization:t.specialization||"",image:t.image||"",availableDays:t.availableDays||[]});
  };
  const saveEditTherapist=async()=>{
    if(!editTherapistForm.name){ showAlert("الاسم مطلوب","error"); return; }
    try{
      await db.collection("therapists").doc(editingTherapist.id).update({...editTherapistForm});
      const batch = db.batch();
      schedules.filter(s=>s.therapistName===editingTherapist.name).forEach(s=>{
        batch.update(db.collection("schedules").doc(s.id), {therapistName:editTherapistForm.name});
      });
      patients.filter(p=>p.therapistName===editingTherapist.name).forEach(p=>{
        batch.update(db.collection("patients").doc(p.id), {therapistName:editTherapistForm.name});
      });
      await batch.commit();
      showAlert("✅ تم تعديل المعالج بكل مكان","success");
      setEditingTherapist(null);
      fetchData();
    }catch(e){ showAlert("خطأ بالتعديل","error"); }
  };
  const deleteTherapist=async(t)=>{
    const relatedPatients = patients.filter(p=>p.therapistName===t.name).length;
    const relatedSchedules = schedules.filter(s=>s.therapistName===t.name).length;
    if(!confirm(`⚠ حذف المعالج ${t.name} ؟\nلديه ${relatedPatients} مراجع و ${relatedSchedules} جلسة`)) return;
    await db.collection("therapists").doc(t.id).delete();
    showAlert(`🗑 تم حذف ${t.name}`,"success");
    fetchData();
  };

  if(!isLoggedIn){
    return React.createElement("div", {className:"min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4"},
      React.createElement("div", {className:"w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-8 border"},
        React.createElement("div", {className:"text-center mb-8"},
          React.createElement("div", {className:"w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl"}, "ع"),
          React.createElement("h1", {className:"text-2xl font-bold"}, "عيادة التأهيل"),
          React.createElement("p", {className:"text-sm text-slate-500 mt-2"}, "نظام مغلق - للأدمن فقط - v5")
        ),
        React.createElement("div", {className:"space-y-4"},
          React.createElement("input", {value:code,onChange:(e)=>setCode(e.target.value),onKeyDown:(e)=>e.key==="Enter"&&handleLogin(),placeholder:"0772",className:"w-full h-12 px-4 rounded-xl border-2 text-center text-lg"}),
          error&&React.createElement("p", {className:"text-red-600 text-sm text-center"}, "❌ "+error),
          React.createElement("button", {onClick:handleLogin,className:"w-full h-12 bg-blue-600 text-white rounded-xl font-bold"}, "🔓 دخول")
        )
      )
    );
  }

  const getTodayDate=()=>new Date().toISOString().split("T")[0];
  const todaySessions=schedules.filter(s=>s.date===getTodayDate()).sort((a,b)=>(a.time||"00:00").localeCompare(b.time||"00:00"));
  const totalRevenue=todaySessions.reduce((s,x)=>s+(Number(x.price)||0),0);
  const paidRevenue=todaySessions.filter(s=>s.paid).reduce((s,x)=>s+(Number(x.price)||0),0);

  const checkConflict = (therapistName, date, time, excludeId=null) => {
    if(!therapistName) return null;
    const newM = timeToMinutes(time);
    for(const s of schedules){
      if(excludeId && s.id===excludeId) continue;
      if(s.therapistName === therapistName && s.date === date && s.status !== "ملغاة"){
        const existingM = timeToMinutes(s.time||"09:00");
        if(Math.abs(newM - existingM) < 60) return s;
      }
    }
    return null;
  };

  const handleAddPatient=async()=>{
    if(!newPatient.name||!newPatient.phone){ showAlert("الاسم والموبايل مطلوبان","error"); return; }
    if(!newPatient.therapist_name){ showAlert("اختر المعالج - مطلوب لفحص التضارب","error"); return; }
    if(selectedDays.length===0){ showAlert("اختر أيام الحجز","error"); return; }
    const today=new Date();
    const datesToCheck=[];
    for(let i=0;i<4;i++){ 
      const baseDate=new Date(today); baseDate.setDate(baseDate.getDate()+i*7);
      for(const dayNum of selectedDays){
        const sd=new Date(baseDate); 
        const diff = (dayNum - sd.getDay() + 7) % 7;
        sd.setDate(sd.getDate()+diff);
        if(sd.getDay()===5){ showAlert("الجمعة عطلة","error"); return; }
        const dateStr=sd.toISOString().split("T")[0];
        const timeStr=sessionTimes[dayNum];
        // فحص ايام دوام المعالج
        const therapistData = therapists.find(t=>t.name===newPatient.therapist_name);
        if(therapistData && therapistData.availableDays && therapistData.availableDays.length>0){
          const dayOfWeek = sd.getDay();
          if(!therapistData.availableDays.includes(dayOfWeek)){
            showAlert(`⚠ المعالج ${therapistData.name} لا يداوم يوم ${daysMap[dayOfWeek]} - دوامه: ${therapistData.availableDays.map(d=>daysMap[d].replace(" (عطلة)","")).join("، ")}`,"error");
            return;
          }
        }
        const conflict = checkConflict(newPatient.therapist_name, dateStr, timeStr);
        if(conflict){ showAlert(`⚠ تضارب! المعالج ${newPatient.therapist_name} لديه ${conflict.patientName} يوم ${dateStr} الساعة ${conflict.time}`,"error"); return; }
        datesToCheck.push({date:sd,time:timeStr,dateStr});
      }
    }
    try{
      const ageString=newPatient.age_value?`${newPatient.age_value} ${newPatient.age_unit}`:"";
      const patientRef = await db.collection("patients").add({name:newPatient.name,phone:newPatient.phone,gender:newPatient.gender,age:ageString,age_value:newPatient.age_value,age_unit:newPatient.age_unit,address:newPatient.address,injury_type:newPatient.injury_type,therapistName:newPatient.therapist_name,createdAt:new Date()});
      const promises=[];
      datesToCheck.forEach(item=>{ promises.push(db.collection("schedules").add({patientName:newPatient.name,patientPhone:newPatient.phone,patientId:patientRef.id,therapistName:newPatient.therapist_name,date:item.dateStr,time:item.time,status:"قادمة",paid:false,price:"",injury_type:newPatient.injury_type,createdAt:new Date()})); });
      await Promise.all(promises); showAlert(`✅ تم حفظ ${newPatient.name} - ${promises.length} جلسة`,"success"); setNewPatient({name:"",phone:"",gender:"ذكر",age_value:"",age_unit:"سنة",address:"",injury_type:"",therapist_name:""}); setSelectedDays([]); fetchData();
    }catch(e){ showAlert("خطأ بالحفظ","error"); }
  };

  const updateSession=async(id,data)=>{ 
    if(data.time || data.therapistName || data.date){
      const sess = schedules.find(s=>s.id===id);
      const newTime = data.time || sess.time;
      const newTherapistName = data.therapistName || sess.therapistName;
      const newDate = data.date || sess.date;
      // فحص دوام عند التعديل
      const thData = therapists.find(t=>t.name===newTherapistName);
      if(thData && thData.availableDays && thData.availableDays.length>0 && newDate){
        const d = new Date(newDate).getDay();
        if(!thData.availableDays.includes(d)){
          showAlert(`⚠ ${thData.name} لا يداوم يوم ${daysMap[d].replace(" (عطلة)","")}`,"error");
          return;
        }
      }
      const conflict = checkConflict(newTherapistName, newDate, newTime, id);
      if(conflict){ showAlert(`⚠ تضارب مع ${conflict.patientName} الساعة ${conflict.time}`,"error"); return; }
    }
    await db.collection("schedules").doc(id).update(data); setSchedules(schedules.map(s=>s.id===id?{...s,...data}:s)); 
  };

  const openEditPatient=(p)=>{
    setEditingPatient(p);
    setEditForm({
      name:p.name||"",
      phone:p.phone||"",
      age_value:p.age_value||"",
      age_unit:p.age_unit||"سنة",
      address:p.address||"",
      injury_type:p.injury_type||"",
      gender:p.gender||"ذكر",
      therapistName:p.therapistName||""
    });
  };
  const saveEditPatient=async()=>{
    if(!editForm.name||!editForm.phone){ showAlert("الاسم والموبايل مطلوب","error"); return; }
    try{
      const ageString = editForm.age_value ? `${editForm.age_value} ${editForm.age_unit}` : "";
      await db.collection("patients").doc(editingPatient.id).update({
        name:editForm.name, phone:editForm.phone, age_value:editForm.age_value, age_unit:editForm.age_unit, age:ageString,
        address:editForm.address, injury_type:editForm.injury_type, gender:editForm.gender, therapistName:editForm.therapistName
      });
      const batch = db.batch();
      const related = schedules.filter(s=>s.patientId===editingPatient.id || s.patientPhone===editingPatient.phone || s.patientName===editingPatient.name);
      related.forEach(s=>{
        batch.update(db.collection("schedules").doc(s.id), {patientName:editForm.name, patientPhone:editForm.phone, injury_type:editForm.injury_type, therapistName: editForm.therapistName || s.therapistName});
      });
      await batch.commit();
      showAlert(`✅ تم التعديل - تحدث ${related.length} جلسة`,"success");
      setEditingPatient(null);
      fetchData();
    }catch(e){ showAlert("خطأ بالتعديل","error"); }
  };

  const deletePatientCompletely=async(p)=>{
    const related = schedules.filter(s=>s.patientId===p.id || s.patientPhone===p.phone);
    if(!confirm(`⚠ تحذير!\nسيتم حذف المراجع ${p.name} و ${related.length} جلسة تابعة له نهائياً\nمتأكد؟`)) return;
    if(!confirm(`تأكيد أخير - حذف نهائي؟`)) return;
    try{
      showAlert("⏳ جاري الحذف...","info");
      const batch = db.batch();
      related.forEach(s=>{ batch.delete(db.collection("schedules").doc(s.id)); });
      await batch.commit();
      await db.collection("patients").doc(p.id).delete();
      showAlert(`🗑 تم حذف ${p.name} و ${related.length} جلسة`,"success");
      fetchData();
    }catch(e){ showAlert("خطأ بالحذف","error"); }
  };

  const deleteSingleSession=async(sId)=>{
    if(!confirm("حذف هذه الجلسة فقط؟")) return;
    await db.collection("schedules").doc(sId).delete();
    setSchedules(schedules.filter(s=>s.id!==sId));
    showAlert("🗑 تم حذف الجلسة","success");
  };

  return React.createElement("div", {className:"min-h-screen bg-[#f6f8fc]"},
    React.createElement("header", {className:"sticky top-0 z-30 bg-white border-b shadow-sm no-print"},
      React.createElement("div", {className:"max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between"},
        React.createElement("div", {className:"flex items-center gap-3"},
          React.createElement("div", {className:"w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold"}, "ع"),
          React.createElement("div", {}, React.createElement("div", {className:"font-bold text-[15px]"}, "عيادة رقية للعلاج الطبيعي ✅ v5"), React.createElement("div", {className:"text-[10px] text-emerald-600 font-bold"}, "صورة + دوام + فحص ذكي"))
        ),
        React.createElement("div", {className:"flex items-center gap-2"},
          React.createElement("button", {onClick:()=>{ if(window.OneSignal){ window.OneSignalDeferred.push(async function(OneSignal){ await OneSignal.Slidedown.promptPush(); }); } },className:"h-9 px-3 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold"}, "🔔 فعل الإشعارات"),
          React.createElement("button", {onClick:handleLogout,className:"h-9 px-4 rounded-full bg-red-100 text-red-700 text-[12px] font-bold"}, "🚪 خروج")
        )
      )
    ),
    React.createElement("div", {className:"sticky top-16 z-20 bg-white border-b no-print"},
      React.createElement("div", {className:"max-w-[1280px] mx-auto px-4 flex gap-2 overflow-x-auto"},
        [{id:"today-sessions",label:"🕐 جلسات اليوم"},{id:"add-patient",label:"➕ إضافة مراجع"},{id:"patients-list",label:"👥 المراجعين"},{id:"therapists",label:"👨⚕ الكادر v5"},{id:"notifications",label:"🔔 الإشعارات"}].map(t=>React.createElement("button", {key:t.id,onClick:()=>setTab(t.id),className:`h-12 px-4 whitespace-nowrap border-b-2 text-[13px] font-medium ${tab===t.id?"border-b-blue-600 text-blue-600 bg-blue-50/50":"border-b-transparent text-slate-600"}`}, t.label))
      )
    ),
    alert&&React.createElement("div", {className:`fixed z-50 top-20 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-xl text-[13px] font-bold max-w-[90%] text-center ${alert.type==="error"?"bg-red-600 text-white":alert.type==="success"?"bg-emerald-600 text-white":"bg-blue-600 text-white"}`}, alert.msg),

    React.createElement("main", {className:"max-w-[1280px] mx-auto p-4 pb-10"},
      loading&&React.createElement("div", {className:"text-center py-10"}, "⏳ جاري التحميل..."),

      !loading&&tab==="today-sessions"&&React.createElement("div", {className:"space-y-4"},
        React.createElement("div", {className:"grid grid-cols-2 md:grid-cols-3 gap-3"},
          React.createElement("div", {className:"bg-white rounded-2xl border p-5"}, React.createElement("div", {className:"text-[11px] text-blue-600 font-bold"}, "🕐 جلسات اليوم"), React.createElement("div", {className:"text-3xl font-bold text-blue-600 mt-2"}, todaySessions.length)),
          React.createElement("div", {className:"bg-white rounded-2xl border p-5"}, React.createElement("div", {className:"text-[11px] font-bold"}, "💰 الإجمالي"), React.createElement("div", {className:"text-2xl font-bold mt-2"}, totalRevenue.toLocaleString()+" د.ع")),
          React.createElement("div", {className:"bg-white rounded-2xl border p-5"}, React.createElement("div", {className:"text-[11px] text-emerald-600 font-bold"}, "✅ مدفوع"), React.createElement("div", {className:"text-2xl font-bold text-emerald-600 mt-2"}, paidRevenue.toLocaleString()+" د.ع"))
        ),
        React.createElement("div", {className:"bg-white rounded-[20px] border shadow-sm overflow-hidden"},
          React.createElement("div", {className:"p-5 border-b bg-slate-50 font-bold text-[14px] flex justify-between items-center"},
            React.createElement("span", {}, `📅 جدول اليوم - ${todaySessions.length} جلسة`),
            React.createElement("button", {onClick:()=>window.print(),className:"no-print h-8 px-3 rounded-full bg-slate-900 text-white text-[11px]"}, "🖨 طباعة")
          ),
          todaySessions.length>0?
          React.createElement("div", {className:"overflow-x-auto"},
            React.createElement("table", {className:"w-full text-[13px]"},
              React.createElement("thead", {className:"bg-slate-100 text-[11px] text-slate-600"},
                React.createElement("tr", {}, React.createElement("th", {className:"p-3 text-right"}, "🕐 الوقت"), React.createElement("th", {className:"p-3 text-right"}, "👤 المراجع"), React.createElement("th", {className:"p-3 text-right"}, "👨⚕ المعالج"), React.createElement("th", {className:"p-3 text-right"}, "📋 الحالة"), React.createElement("th", {className:"p-3 text-right"}, "💰"), React.createElement("th", {className:"p-3 text-right"}, "💳"), React.createElement("th", {className:"p-3 text-right no-print"}, "إجراء"))
              ),
              React.createElement("tbody", {},
                todaySessions.map(s=>{
                  const th = therapists.find(t=>t.name===s.therapistName);
                  return React.createElement("tr", {key:s.id,className:"border-t hover:bg-blue-50/50"},
                    React.createElement("td", {className:"p-3 font-bold text-blue-600"}, React.createElement("input", {type:"time",value:s.time||"09:00",onChange:(e)=>updateSession(s.id,{time:e.target.value}),className:"w-24 h-7 px-1 rounded border text-[11px]"})),
                    React.createElement("td", {className:"p-3"}, React.createElement("div", {className:"font-bold"}, s.patientName), React.createElement("div", {className:"text-[11px] text-slate-500"}, s.injury_type||"-")),
                    React.createElement("td", {className:"p-3"}, 
                      React.createElement("div", {className:"flex items-center gap-2"},
                        th&&th.image ? React.createElement("img", {src:th.image,className:"w-6 h-6 rounded-full object-cover"}) : null,
                        React.createElement("select", {value:s.therapistName||"",onChange:(e)=>updateSession(s.id,{therapistName:e.target.value}),className:"text-[11px] px-2 py-1 rounded-full border font-bold"}, therapists.map(t=>React.createElement("option", {key:t.id,value:t.name}, t.name)))
                      )
                    ),
                    React.createElement("td", {className:"p-3"}, React.createElement("select", {value:s.status||"قادمة",onChange:(e)=>updateSession(s.id,{status:e.target.value}),className:"text-[11px] px-2 py-1 rounded-full border font-bold"}, React.createElement("option", {}, "قادمة"), React.createElement("option", {}, "مكتملة"), React.createElement("option", {}, "ملغاة"), React.createElement("option", {}, "غائب"))),
                    React.createElement("td", {className:"p-3"}, React.createElement("input", {type:"number",defaultValue:s.price,onBlur:(e)=>{ if(e.target.value!==s.price) updateSession(s.id,{price:e.target.value}); },placeholder:"0",className:"w-16 h-8 px-2 rounded-lg border text-[12px]"})),
                    React.createElement("td", {className:"p-3"}, React.createElement("button", {onClick:()=>updateSession(s.id,{paid:!s.paid}),className:`px-3 py-1 rounded-full text-[11px] font-bold ${s.paid?"bg-emerald-600 text-white":"bg-red-600 text-white"}`}, s.paid?"✓":"✗")),
                    React.createElement("td", {className:"p-3 no-print flex gap-1"}, React.createElement("a", {href:formatToWhatsApp(s.patientPhone),target:"_blank",className:"w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-[12px]"}, "💬"), React.createElement("button", {onClick:()=>deleteSingleSession(s.id),className:"w-7 h-7 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-[12px]"}, "🗑"))
                  )
                })
              )
            )
          )
          : React.createElement("div", {className:"p-12 text-center"}, "😊 لا توجد جلسات اليوم")
        )
      ),

      !loading&&tab==="patients-list"&&React.createElement("div", {className:"space-y-4"},
        React.createElement("div", {className:"bg-white rounded-[20px] border p-4 flex gap-3 items-center"},
          React.createElement("input", {value:searchPatient,onChange:(e)=>setSearchPatient(e.target.value),placeholder:"🔍 بحث بالاسم او الموبايل...",className:"flex-1 h-11 px-4 rounded-xl border text-[13px]"}),
          React.createElement("div", {className:"text-[12px] font-bold"}, `${patients.filter(p=>!searchPatient||p.name.includes(searchPatient)||p.phone.includes(searchPatient)).length} مراجع`)
        ),
        React.createElement("div", {className:"grid grid-cols-1 gap-3"},
          patients.filter(p=>!searchPatient||p.name.includes(searchPatient)||p.phone.includes(searchPatient)).map(p=>{
            const pSessions = schedules.filter(s=>s.patientId===p.id || s.patientPhone===p.phone || s.patientName===p.name).sort((a,b)=>a.date.localeCompare(b.date));
            const pTherapist = therapists.find(t=>t.name===p.therapistName);
            return React.createElement("div", {key:p.id,className:"bg-white rounded-[20px] border p-5 shadow-sm"},
              React.createElement("div", {className:"flex justify-between items-start"},
                React.createElement("div", {className:"flex-1"},
                  React.createElement("div", {className:"font-bold text-[15px] flex items-center gap-2"}, p.name, React.createElement("span", {className:"text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"}, `${pSessions.length} جلسة`)),
                  React.createElement("div", {className:"text-[12px] text-slate-600 mt-1 space-y-1"},
                    React.createElement("div", {}, `📱 ${p.phone} • ${p.age||"-"} • ${p.gender||"-"}`),
                    React.createElement("div", {className:"flex items-center gap-2"}, 
                      React.createElement("span", {}, `📍 ${p.address||"بدون عنوان"} • 🩺 ${p.injury_type||"-"}`),
                      pTherapist&&pTherapist.image ? React.createElement("img", {src:pTherapist.image,className:"w-5 h-5 rounded-full"}) : null,
                      React.createElement("span", {}, `👨⚕ ${p.therapistName||"-"}`)
                    )
                  )
                ),
                React.createElement("div", {className:"flex flex-col gap-1.5 ml-3"},
                  React.createElement("a", {href:formatToWhatsApp(p.phone),target:"_blank",className:"w-9 h-9 bg-green-100 text-green-600 rounded-full flex items-center justify-center"}, "💬"),
                  React.createElement("button", {onClick:()=>openEditPatient(p),className:"w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center text-[13px]"}, "✏"),
                  React.createElement("button", {onClick:()=>deletePatientCompletely(p),className:"w-9 h-9 bg-red-600 text-white rounded-full flex items-center justify-center text-[13px]"}, "🗑")
                )
              )
            )
          })
        ),
        editingPatient&&React.createElement("div", {className:"fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"},
          React.createElement("div", {className:"bg-white rounded-[20px] p-6 w-full max-w-xl max-h-[92vh] overflow-y-auto"},
            React.createElement("h3", {className:"font-bold text-[16px] mb-4"}, `✏ تعديل: ${editingPatient.name}`),
            React.createElement("div", {className:"space-y-3"},
              React.createElement("div", {className:"grid grid-cols-2 gap-2"},
                React.createElement("input", {value:editForm.name,onChange:(e)=>setEditForm({...editForm,name:e.target.value}),placeholder:"الاسم",className:"w-full h-10 px-3 rounded-xl border text-[13px]"}),
                React.createElement("input", {value:editForm.phone,onChange:(e)=>setEditForm({...editForm,phone:e.target.value}),placeholder:"الموبايل",className:"w-full h-10 px-3 rounded-xl border text-[13px]",style:{direction:"ltr"}})
              ),
              React.createElement("div", {className:"flex gap-2 mt-2"},
                React.createElement("button", {onClick:saveEditPatient,className:"flex-1 h-11 bg-blue-600 text-white rounded-xl font-bold"}, "💾 حفظ"),
                React.createElement("button", {onClick:()=>setEditingPatient(null),className:"flex-1 h-11 bg-slate-100 rounded-xl font-bold"}, "إلغاء")
              )
            )
          )
        )
      ),

      !loading&&tab==="add-patient"&&React.createElement("div", {className:"grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4"},
        React.createElement("div", {className:"bg-white rounded-[20px] border p-6"},
          React.createElement("h2", {className:"font-bold mb-4"}, "➕ إضافة مريض مع فحص تضارب ودوام"),
          React.createElement("div", {className:"space-y-3"},
            React.createElement("div", {className:"grid grid-cols-2 gap-3"},
              React.createElement("input", {value:newPatient.name,onChange:(e)=>setNewPatient({...newPatient,name:e.target.value}),placeholder:"الاسم *",className:"h-10 px-3 rounded-xl border text-[13px]"}),
              React.createElement("input", {value:newPatient.phone,onChange:(e)=>setNewPatient({...newPatient,phone:e.target.value}),placeholder:"الموبايل *",className:"h-10 px-3 rounded-xl border text-[13px]",style:{direction:"ltr"}})
            ),
            React.createElement("div", {className:"grid grid-cols-2 gap-3"},
              React.createElement("select", {value:newPatient.injury_type,onChange:(e)=>setNewPatient({...newPatient,injury_type:e.target.value}),className:"h-10 px-3 rounded-xl border text-[13px]"}, React.createElement("option", {value:""}, "نوع الإصابة..."), injuryTypes.map(t=>React.createElement("option", {key:t,value:t}, t))),
              React.createElement("select", {value:newPatient.therapist_name,onChange:(e)=>setNewPatient({...newPatient,therapist_name:e.target.value}),className:"h-10 px-3 rounded-xl border text-[13px] bg-amber-50 border-amber-300"}, 
                React.createElement("option", {value:""}, "المعالج *"), 
                therapists.map(t=>{
                  const daysText = t.availableDays && t.availableDays.length>0 ? ` - ${t.availableDays.map(d=>daysMap[d].replace(" (عطلة)","").substring(0,3)).join("/")}` : " - كل الأيام";
                  return React.createElement("option", {key:t.id,value:t.name}, `${t.name}${daysText}`);
                })
              )
            )
          )
        ),
        React.createElement("div", {className:"bg-white rounded-[20px] border p-6 h-fit"},
          React.createElement("h3", {className:"font-bold mb-4 text-[14px]"}, "📅 أيام الحجز"),
          React.createElement("div", {className:"space-y-2"},
            daysOrder.map(day=>{
              const selectedTherapist = therapists.find(t=>t.name===newPatient.therapist_name);
              const isOff = selectedTherapist && selectedTherapist.availableDays && selectedTherapist.availableDays.length>0 && !selectedTherapist.availableDays.includes(day);
              return React.createElement("label", {key:day,className:`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer ${selectedDays.includes(day)?"border-blue-600 bg-blue-50":"border-slate-200"} ${isOff?"opacity-40 bg-red-50" : ""}`},
                React.createElement("input", {type:"checkbox",checked:selectedDays.includes(day),onChange:(e)=>{ if(e.target.checked) setSelectedDays([...selectedDays,day]); else setSelectedDays(selectedDays.filter(d=>d!==day)); },disabled:isOff}),
                React.createElement("span", {className:"font-bold text-[13px] flex-1"}, daysMap[day], isOff?React.createElement("span", {className:"text-[10px] text-red-600 mr-2"}, " (عطلة المعالج)"):""),
                React.createElement("input", {type:"time",value:sessionTimes[day],onChange:(e)=>setSessionTimes({...sessionTimes,[day]:e.target.value}),className:"h-8 px-2 rounded-lg border text-[12px]"})
              )
            })
          ),
          React.createElement("button", {onClick:handleAddPatient,className:"mt-6 w-full h-11 bg-blue-600 text-white rounded-xl font-bold"}, "✅ حفظ مع فحص الدوام")
        )
      ),

      !loading&&tab==="therapists"&&React.createElement("div", {className:"space-y-4"},
        React.createElement("div", {className:"grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4"},
          React.createElement("div", {className:"bg-white rounded-[20px] border p-5 h-fit sticky top-36"},
            React.createElement("h3", {className:"font-bold mb-4 text-[14px]"}, "➕ إضافة معالج جديد - v5"),
            React.createElement("div", {className:"space-y-3"},
              React.createElement("div", {className:"flex justify-center"},
                React.createElement("div", {className:"relative"},
                  newTherapist.image ? 
                    React.createElement("img", {src:newTherapist.image,className:"w-20 h-20 rounded-full object-cover border-4 border-blue-100"}) :
                    React.createElement("div", {className:"w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed flex items-center justify-center text-2xl"}, "📷"),
                  React.createElement("label", {className:"absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-[12px] cursor-pointer shadow"},
                    "✏",
                    React.createElement("input", {type:"file",accept:"image/*",onChange:(e)=>handleTherapistImage(e,false),className:"hidden"})
                  )
                )
              ),
              React.createElement("div", {}, React.createElement("label", {className:"text-[11px] font-bold"}, "اسم المعالج *"), React.createElement("input", {value:newTherapist.name,onChange:(e)=>setNewTherapist({...newTherapist,name:e.target.value}),placeholder:"مثال: د. أحمد",className:"w-full h-10 px-3 rounded-xl border text-[13px] mt-1"})),
              React.createElement("div", {}, React.createElement("label", {className:"text-[11px] font-bold"}, "رقم الموبايل"), React.createElement("input", {value:newTherapist.phone,onChange:(e)=>setNewTherapist({...newTherapist,phone:e.target.value}),placeholder:"07xx xxx xxxx",className:"w-full h-10 px-3 rounded-xl border text-[13px] mt-1",style:{direction:"ltr"}})),
              React.createElement("div", {}, React.createElement("label", {className:"text-[11px] font-bold"}, "التخصص"), React.createElement("input", {value:newTherapist.specialization,onChange:(e)=>setNewTherapist({...newTherapist,specialization:e.target.value}),placeholder:"مثال: علاج طبيعي - ركبة",className:"w-full h-10 px-3 rounded-xl border text-[13px] mt-1"})),
              React.createElement("div", {},
                React.createElement("label", {className:"text-[11px] font-bold mb-2 block"}, "📅 أيام الدوام"),
                React.createElement("div", {className:"grid grid-cols-3 gap-1.5"},
                  daysOrder.map(d=>React.createElement("label", {key:d,className:`p-2 rounded-xl border text-center cursor-pointer text-[11px] font-bold ${newTherapist.availableDays.includes(d)?"bg-blue-600 text-white border-blue-600":"bg-white"}`},
                    React.createElement("input", {type:"checkbox",checked:newTherapist.availableDays.includes(d),onChange:(e)=>{
                      if(e.target.checked) setNewTherapist({...newTherapist,availableDays:[...newTherapist.availableDays,d]});
                      else setNewTherapist({...newTherapist,availableDays:newTherapist.availableDays.filter(x=>x!==d)});
                    },className:"hidden"}),
                    daysMap[d].replace(" (عطلة)","")
                  ))
                )
              ),
              React.createElement("button", {onClick:handleAddTherapist,className:"w-full h-11 bg-blue-600 text-white rounded-xl font-bold mt-2"}, "✅ إضافة للكادر")
            )
          ),
          React.createElement("div", {className:"bg-white rounded-[20px] border p-5"},
            React.createElement("div", {className:"flex justify-between items-center mb-4"},
              React.createElement("h3", {className:"font-bold text-[14px]"}, `👨⚕ الكادر (${therapists.length}) - مع صور ودوام`),
              React.createElement("input", {value:searchTherapist,onChange:(e)=>setSearchTherapist(e.target.value),placeholder:"🔍 بحث...",className:"w-32 h-9 px-3 rounded-full border text-[11px]"})
            ),
            React.createElement("div", {className:"space-y-3"},
              therapists.filter(t=>!searchTherapist||t.name.includes(searchTherapist)).map(t=>{
                const countPatients = patients.filter(p=>p.therapistName===t.name).length;
                const countToday = schedules.filter(s=>s.therapistName===t.name && s.date===getTodayDate()).length;
                return React.createElement("div", {key:t.id,className:"p-4 rounded-2xl border-2 hover:border-blue-200 transition bg-gradient-to-l from-white to-slate-50"},
                  React.createElement("div", {className:"flex justify-between items-start"},
                    React.createElement("div", {className:"flex gap-3"},
                      t.image ?
                        React.createElement("img", {src:t.image,className:"w-12 h-12 rounded-full object-cover border-2 border-blue-100"}) :
                        React.createElement("div", {className:"w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-[14px]"}, t.name.charAt(0)),
                      React.createElement("div", {},
                        React.createElement("div", {className:"font-bold text-[14px] flex items-center gap-2"}, t.name, t.availableDays&&t.availableDays.length>0&&React.createElement("span", {className:"text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"}, `${t.availableDays.length} أيام`)),
                        React.createElement("div", {className:"text-[11px] text-slate-500 mt-0.5"}, `${t.phone||"بدون رقم"} • ${t.specialization||"بدون تخصص"}`),
                        React.createElement("div", {className:"flex gap-2 mt-2 flex-wrap"},
                          React.createElement("span", {className:"text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold"}, `👥 ${countPatients} مراجع`),
                          React.createElement("span", {className:"text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold"}, `🕐 ${countToday} اليوم`)
                        ),
                        t.availableDays&&t.availableDays.length>0&&React.createElement("div", {className:"flex gap-1 mt-2 flex-wrap"},
                          t.availableDays.map(d=>React.createElement("span", {key:d,className:"text-[9px] px-2 py-0.5 rounded-full bg-slate-900 text-white"}, daysMap[d].replace(" (عطلة)","")))
                        )
                      )
                    ),
                    React.createElement("div", {className:"flex gap-1.5"},
                      React.createElement("button", {onClick:()=>openEditTherapist(t),className:"w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"}, "✏"),
                      React.createElement("button", {onClick:()=>deleteTherapist(t),className:"w-8 h-8 bg-red-50 text-red-600 rounded-full flex items-center justify-center"}, "🗑")
                    )
                  )
                )
              })
            )
          )
        ),
        editingTherapist&&React.createElement("div", {className:"fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"},
          React.createElement("div", {className:"bg-white rounded-[20px] p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"},
            React.createElement("h3", {className:"font-bold mb-4"}, `✏ تعديل: ${editingTherapist.name}`),
            React.createElement("div", {className:"space-y-3"},
              React.createElement("div", {className:"flex justify-center mb-2"},
                React.createElement("div", {className:"relative"},
                  editTherapistForm.image ?
                    React.createElement("img", {src:editTherapistForm.image,className:"w-20 h-20 rounded-full object-cover border-4 border-blue-100"}) :
                    React.createElement("div", {className:"w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed flex items-center justify-center text-2xl"}, "📷"),
                  React.createElement("label", {className:"absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-[12px] cursor-pointer"},
                    "✏",
                    React.createElement("input", {type:"file",accept:"image/*",onChange:(e)=>handleTherapistImage(e,true),className:"hidden"})
                  )
                )
              ),
              React.createElement("input", {value:editTherapistForm.name,onChange:(e)=>setEditTherapistForm({...editTherapistForm,name:e.target.value}),placeholder:"الاسم",className:"w-full h-10 px-3 rounded-xl border text-[13px]"}),
              React.createElement("input", {value:editTherapistForm.phone,onChange:(e)=>setEditTherapistForm({...editTherapistForm,phone:e.target.value}),placeholder:"الموبايل",className:"w-full h-10 px-3 rounded-xl border text-[13px]",style:{direction:"ltr"}}),
              React.createElement("input", {value:editTherapistForm.specialization,onChange:(e)=>setEditTherapistForm({...editTherapistForm,specialization:e.target.value}),placeholder:"التخصص",className:"w-full h-10 px-3 rounded-xl border text-[13px]"}),
              React.createElement("div", {},
                React.createElement("label", {className:"text-[11px] font-bold mb-2 block"}, "📅 أيام الدوام"),
                React.createElement("div", {className:"grid grid-cols-3 gap-1.5"},
                  daysOrder.map(d=>React.createElement("label", {key:d,className:`p-2 rounded-xl border text-center cursor-pointer text-[11px] font-bold ${editTherapistForm.availableDays.includes(d)?"bg-blue-600 text-white border-blue-600":"bg-white"}`},
                    React.createElement("input", {type:"checkbox",checked:editTherapistForm.availableDays.includes(d),onChange:(e)=>{
                      if(e.target.checked) setEditTherapistForm({...editTherapistForm,availableDays:[...editTherapistForm.availableDays,d]});
                      else setEditTherapistForm({...editTherapistForm,availableDays:editTherapistForm.availableDays.filter(x=>x!==d)});
                    },className:"hidden"}),
                    daysMap[d].replace(" (عطلة)","")
                  ))
                )
              ),
              React.createElement("div", {className:"bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800"}, "⚠ تعديل الاسم راح يحدث كل جلسات ومراجعي هذا المعالج تلقائياً"),
              React.createElement("div", {className:"flex gap-2 mt-2"},
                React.createElement("button", {onClick:saveEditTherapist,className:"flex-1 h-11 bg-blue-600 text-white rounded-xl font-bold"}, "💾 حفظ"),
                React.createElement("button", {onClick:()=>setEditingTherapist(null),className:"flex-1 h-11 bg-slate-100 rounded-xl font-bold"}, "إلغاء")
              )
            )
          )
        )
      ),

      !loading&&tab==="notifications"&&React.createElement("div", {className:"bg-white rounded-[20px] border p-6"},
        React.createElement("h2", {className:"font-bold mb-4"}, "🔔 إرسال إشعار"),
        React.createElement("input", {value:notifTitle,onChange:(e)=>setNotifTitle(e.target.value),placeholder:"العنوان",className:"w-full h-11 px-4 rounded-xl border text-[13px] mb-3"}),
        React.createElement("textarea", {value:notifMsg,onChange:(e)=>setNotifMsg(e.target.value),placeholder:"الرسالة",rows:4,className:"w-full p-4 rounded-xl border text-[13px] mb-3"}),
        React.createElement("button", {onClick:async()=>{
          if(!notifTitle||!notifMsg){ showAlert("اكتب عنوان ورسالة","error"); return; }
          showAlert("✅ تم","success");
        },className:"w-full h-12 bg-blue-600 text-white rounded-xl font-bold"}, "🚀 إرسال")
      )
    )
  );
}
const root=ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));

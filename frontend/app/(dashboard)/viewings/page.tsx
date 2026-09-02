'use client'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, User, Phone, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const S = { bg:'#F4F6F9',surface:'#FFFFFF',surface2:'#F8FAFB',border:'#E2E5EA',t1:'#0B1320',t2:'#44546A',t3:'#8A9BB0',green:'#059669',greenLt:'#ECFDF5',greenTx:'#047857',greenRim:'rgba(5,150,105,0.2)',amber:'#D97706',amberLt:'#FFFBEB',red:'#DC2626',redLt:'#FEF2F2',shadow:'0 1px 3px rgba(11,19,32,0.06)' }

interface ViewingRequest{id:number;date:string;time:string;status:string;buyer_name:string;buyer_phone:string;message:string|null;rejection_note:string|null;created_at:string;listing_ref:string|null;property:{street:string;house_number:string;city:string}|null}
interface Slot{id:number;day_of_week:number;day_name:string;start_time:string;end_time:string}

const inp=(w='100%')=>({width:w,height:'38px',padding:'0 12px',background:S.surface,border:`1px solid ${S.border}`,fontFamily:'inherit',fontSize:'13.5px',color:S.t1,outline:'none'})

export default function ViewingsPage() {
  const {t,lang}=useLanguage();const nl=lang==='nl'
  const DAYS=nl?['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag']:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const [requests,setRequests]=useState<ViewingRequest[]>([])
  const [slots,setSlots]=useState<Slot[]>([])
  const [loading,setLoading]=useState(true)
  const [actionId,setActionId]=useState<number|null>(null)
  const [rejectingId,setRejectingId]=useState<number|null>(null)
  const [rejectNote,setRejectNote]=useState('')
  const [tab,setTab]=useState<'requests'|'availability'>('requests')
  const [newSlot,setNewSlot]=useState({day_of_week:0,start_time:'09:00',end_time:'17:00'})
  const [savingSlot,setSavingSlot]=useState(false)

  useEffect(()=>{loadAll()},[])

  async function loadAll(){setLoading(true);const token=localStorage.getItem('groundr_token');try{const[rR,sR]=await Promise.all([fetch(API_BASE+'/api/viewings/requests',{headers:{Authorization:`Bearer ${token}`}}),fetch(API_BASE+'/api/viewings/availability/1')]);setRequests((await rR.json()).requests||[]);setSlots((await sR.json()).slots||[])}catch{}finally{setLoading(false)}}
  async function confirm(id:number){setActionId(id);const token=localStorage.getItem('groundr_token');await fetch(`${API_BASE}/api/viewings/${id}/confirm`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});setRequests(prev=>prev.map(r=>r.id===id?{...r,status:'confirmed'}:r));setActionId(null)}
  async function reject(id:number){setActionId(id);const token=localStorage.getItem('groundr_token');await fetch(`${API_BASE}/api/viewings/${id}/reject`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({note:rejectNote})});setRequests(prev=>prev.map(r=>r.id===id?{...r,status:'rejected',rejection_note:rejectNote}:r));setRejectingId(null);setRejectNote('');setActionId(null)}
  async function addSlot(){setSavingSlot(true);const token=localStorage.getItem('groundr_token');const res=await fetch(API_BASE+'/api/viewings/availability',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(newSlot)});if(res.ok)loadAll();setSavingSlot(false)}
  async function deleteSlot(id:number){const token=localStorage.getItem('groundr_token');await fetch(`${API_BASE}/api/viewings/availability/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});setSlots(prev=>prev.filter(s=>s.id!==id))}

  const statusColor=(s:string)=>({pending:{color:S.amber,bg:S.amberLt,rim:'rgba(217,119,6,0.2)'},confirmed:{color:S.green,bg:S.greenLt,rim:S.greenRim},rejected:{color:S.red,bg:S.redLt,rim:'rgba(220,38,38,0.2)'}}[s]||{color:S.amber,bg:S.amberLt,rim:'rgba(217,119,6,0.2)'})
  const statusLabel=(s:string)=>({pending:nl?'In afwachting':'Pending',confirmed:nl?'Bevestigd':'Confirmed',rejected:nl?'Afgewezen':'Rejected'}[s]||s)
  const pending=requests.filter(r=>r.status==='pending').length
  const confirmed=requests.filter(r=>r.status==='confirmed').length

  return (
    <div style={{minHeight:'100vh',background:S.bg,fontFamily:"'DM Sans', sans-serif"}}>
      <nav style={{background:S.surface,borderBottom:`1px solid ${S.border}`,height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',position:'sticky',top:0,zIndex:100,boxShadow:S.shadow}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <Link href="/dashboard" style={{color:S.t3,display:'flex'}}><ArrowLeft size={16}/></Link>
          <img src="/logo.svg" alt="Groundr" style={{height:'32px'}}/>
          <span style={{color:S.border}}>·</span>
          <span style={{fontSize:'13.5px',color:S.t2}}>{t('viewings.title')}</span>
          {pending>0&&<span style={{padding:'2px 8px',fontSize:'11px',fontWeight:500,background:S.amberLt,color:S.amber,border:'1px solid rgba(217,119,6,0.2)'}}>{pending} {nl?'wachtend':'pending'}</span>}
        </div>
        <LanguageToggle/>
      </nav>

      <div style={{maxWidth:'860px',margin:'0 auto',padding:'32px'}}>
        <div style={{marginBottom:'24px'}}>
          <h1 style={{fontSize:'22px',fontWeight:600,color:S.t1,letterSpacing:'-0.3px'}}>{t('viewings.title')}</h1>
          <p style={{fontSize:'13px',color:S.t3,marginTop:'3px'}}>{nl?'Beheer aanvragen en stel uw beschikbaarheid in':'Manage requests and set your availability'}</p>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0,background:S.border,border:`1px solid ${S.border}`,marginBottom:'24px',boxShadow:S.shadow}}>
          {[{label:nl?'In afwachting':'Pending',value:pending,color:S.amber},{label:nl?'Bevestigd':'Confirmed',value:confirmed,color:S.green},{label:nl?'Totaal':'Total',value:requests.length,color:S.t1}].map((s,i)=>(
            <div key={i} style={{background:S.surface,padding:'18px 20px'}}>
              <div style={{fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'6px'}}>{s.label}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:'24px',fontWeight:500,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:`1px solid ${S.border}`,marginBottom:'24px'}}>
          {[{key:'requests',label:nl?'Aanvragen':'Requests'},{key:'availability',label:nl?'Mijn beschikbaarheid':'My availability'}].map(tab_item=>(
            <button key={tab_item.key} onClick={()=>setTab(tab_item.key as any)} style={{padding:'0 16px',height:'42px',fontSize:'13.5px',fontWeight:tab===tab_item.key?500:400,color:tab===tab_item.key?S.t1:S.t3,background:'none',border:'none',borderBottom:tab===tab_item.key?`2px solid ${S.green}`:'2px solid transparent',cursor:'pointer',marginBottom:'-1px'}}>
              {tab_item.label}
            </button>
          ))}
        </div>

        {loading&&<div style={{textAlign:'center',padding:'48px',color:S.t3,fontSize:'13px'}}>{t('common.loading')}</div>}

        {!loading&&tab==='requests'&&(
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {requests.length===0&&(
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'64px 0',textAlign:'center'}}>
                <div style={{width:'48px',height:'48px',background:S.surface,border:`1px solid ${S.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'14px',boxShadow:S.shadow}}><Calendar size={22} color={S.green}/></div>
                <p style={{fontSize:'15px',fontWeight:600,color:S.t1,marginBottom:'4px'}}>{t('viewings.empty')}</p>
                <p style={{fontSize:'13px',color:S.t3}}>{nl?'Bezichtigingsverzoeken verschijnen hier':'Viewing requests will appear here'}</p>
              </div>
            )}
            {requests.map(req=>{
              const sc=statusColor(req.status)
              return(
                <div key={req.id} style={{background:S.surface,border:`1px solid ${S.border}`,boxShadow:S.shadow,overflow:'hidden'}}>
                  <div style={{padding:'14px 20px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'16px'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
                      <div style={{width:'36px',height:'36px',background:S.greenLt,border:`1px solid ${S.greenRim}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Calendar size={16} color={S.green}/></div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
                          <span style={{fontSize:'14px',fontWeight:600,color:S.t1}}>{new Date(req.date).toLocaleDateString(nl?'nl-NL':'en-GB',{weekday:'long',day:'numeric',month:'long'})}</span>
                          <span style={{fontFamily:'monospace',fontSize:'13px',fontWeight:600,color:S.green}}>{req.time}</span>
                        </div>
                        {req.property&&<div style={{fontSize:'12px',color:S.t3}}>{req.property.street} {req.property.house_number}, {req.property.city}{req.listing_ref&&<span style={{fontFamily:'monospace',color:S.green,marginLeft:'8px'}}>{req.listing_ref}</span>}</div>}
                      </div>
                    </div>
                    <span style={{padding:'2px 8px',fontSize:'10.5px',fontWeight:500,background:sc.bg,color:sc.color,border:`1px solid ${sc.rim}`,flexShrink:0}}>{statusLabel(req.status)}</span>
                  </div>
                  <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',borderTop:`1px solid ${S.border}`,background:S.surface2}}>
                    <div style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',color:S.t2}}><User size={13} color={S.green}/>{req.buyer_name}</div>
                    <div style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',color:S.t2}}><Phone size={13} color={S.green}/>{req.buyer_phone}</div>
                    {req.message&&<div style={{gridColumn:'1/-1',fontSize:'12.5px',color:S.t2,fontStyle:'italic'}}>"{req.message}"</div>}
                    {req.rejection_note&&<div style={{gridColumn:'1/-1',fontSize:'12.5px',color:S.red}}>{nl?'Reden:':'Reason:'} {req.rejection_note}</div>}
                  </div>
                  {rejectingId===req.id&&(
                    <div style={{padding:'12px 20px',borderTop:`1px solid ${S.border}`}}>
                      <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder={nl?'Reden voor afwijzing...':'Reason for rejection...'} rows={2} style={{width:'100%',padding:'8px 12px',background:S.surface,border:`1px solid ${S.border}`,fontFamily:'inherit',fontSize:'13px',color:S.t1,outline:'none',resize:'none'}}/>
                    </div>
                  )}
                  {req.status==='pending'&&(
                    <div style={{padding:'12px 20px',display:'flex',gap:'8px',borderTop:`1px solid ${S.border}`}}>
                      {rejectingId===req.id?(
                        <><button onClick={()=>reject(req.id)} disabled={actionId===req.id} style={{display:'flex',alignItems:'center',gap:'6px',height:'32px',padding:'0 14px',background:S.red,color:'white',border:`1px solid ${S.red}`,fontSize:'12.5px',fontWeight:500,cursor:'pointer'}}><XCircle size={13}/>{actionId===req.id?'...':t('viewings.reject')}</button>
                        <button onClick={()=>{setRejectingId(null);setRejectNote('')}} style={{height:'32px',padding:'0 12px',background:S.surface,color:S.t2,border:`1px solid ${S.border}`,fontSize:'12.5px',cursor:'pointer'}}>{t('common.cancel')}</button></>
                      ):(
                        <><button onClick={()=>confirm(req.id)} disabled={actionId===req.id} style={{display:'flex',alignItems:'center',gap:'6px',height:'32px',padding:'0 14px',background:S.green,color:'white',border:`1px solid ${S.green}`,fontSize:'12.5px',fontWeight:500,cursor:'pointer'}}><CheckCircle size={13}/>{actionId===req.id?'...':t('viewings.confirm')}</button>
                        <button onClick={()=>setRejectingId(req.id)} style={{display:'flex',alignItems:'center',gap:'6px',height:'32px',padding:'0 14px',background:S.redLt,color:S.red,border:'1px solid rgba(220,38,38,0.2)',fontSize:'12.5px',fontWeight:500,cursor:'pointer'}}><XCircle size={13}/>{t('viewings.reject')}</button></>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!loading&&tab==='availability'&&(
          <div>
            <div style={{background:S.surface,border:`1px solid ${S.border}`,boxShadow:S.shadow,padding:'20px',marginBottom:'12px'}}>
              <div style={{fontSize:'14px',fontWeight:600,color:S.t1,marginBottom:'16px'}}>{nl?'Beschikbaarheid toevoegen':'Add availability'}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
                <div>
                  <label style={{display:'block',fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'5px'}}>{nl?'Dag':'Day'}</label>
                  <select value={newSlot.day_of_week} onChange={e=>setNewSlot({...newSlot,day_of_week:parseInt(e.target.value)})} style={inp()}>
                    {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'5px'}}>{nl?'Vanaf':'From'}</label>
                  <select value={newSlot.start_time} onChange={e=>setNewSlot({...newSlot,start_time:e.target.value})} style={inp()}>
                    {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'5px'}}>{nl?'Tot':'Until'}</label>
                  <select value={newSlot.end_time} onChange={e=>setNewSlot({...newSlot,end_time:e.target.value})} style={inp()}>
                    {['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={addSlot} disabled={savingSlot} style={{display:'flex',alignItems:'center',gap:'6px',height:'34px',padding:'0 16px',background:S.green,color:'white',border:`1px solid ${S.green}`,fontSize:'13px',fontWeight:500,cursor:'pointer',opacity:savingSlot?0.6:1}}>
                <Plus size={13}/>{savingSlot?(nl?'Opslaan...':'Saving...'):(nl?'Slot toevoegen':'Add slot')}
              </button>
            </div>
            {slots.length===0?(
              <div style={{textAlign:'center',padding:'32px',color:S.t3,fontSize:'13px'}}>{nl?'Nog geen beschikbaarheid ingesteld.':'No availability set yet.'}</div>
            ):(
              <div style={{background:S.surface,border:`1px solid ${S.border}`,boxShadow:S.shadow,overflow:'hidden'}}>
                {slots.map((slot,i)=>(
                  <div key={slot.id} style={{padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:i<slots.length-1?`1px solid ${S.border}`:'none'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'20px'}}>
                      <span style={{fontSize:'13.5px',fontWeight:500,color:S.t1,width:'90px'}}>{slot.day_name}</span>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:S.t2}}><Clock size={13} color={S.green}/>{slot.start_time} – {slot.end_time}</div>
                    </div>
                    <button onClick={()=>deleteSlot(slot.id)} style={{background:'none',border:'none',cursor:'pointer',color:S.t3,display:'flex',alignItems:'center'}}
                      onMouseEnter={e=>(e.currentTarget.style.color=S.red)} onMouseLeave={e=>(e.currentTarget.style.color=S.t3)}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
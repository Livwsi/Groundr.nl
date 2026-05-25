'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, MapPin } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const S = { bg:'#F4F6F9',surface:'#FFFFFF',surface2:'#F8FAFB',border:'#E2E5EA',t1:'#0B1320',t2:'#44546A',t3:'#8A9BB0',green:'#059669',greenLt:'#ECFDF5',greenTx:'#047857',greenRim:'rgba(5,150,105,0.2)',amber:'#D97706',amberLt:'#FFFBEB',red:'#DC2626',redLt:'#FEF2F2',blue:'#2563EB',blueLt:'#EFF6FF',shadow:'0 1px 3px rgba(11,19,32,0.06)' }

interface Melding{id:number;title:string;description:string;category:string;priority:string;status:string;resolution_note:string|null;created_at:string;property:{street:string;house_number:string;city:string}|null;reporter:{email:string;name:string|null}}

const CAT_ICONS: Record<string,string> = {general:'📋',structural:'🏗️',electrical:'⚡',plumbing:'🔧',heating:'🌡️',other:'❓'}

export default function MeldingenPage() {
  const {t,lang}=useLanguage();const nl=lang==='nl'
  const [meldingen,setMeldingen]=useState<Melding[]>([])
  const [loading,setLoading]=useState(true)
  const [filter,setFilter]=useState<'all'|'open'|'resolved'|'closed'>('all')
  const [resolving,setResolving]=useState<number|null>(null)
  const [resolveNote,setResolveNote]=useState('')
  const [actionId,setActionId]=useState<number|null>(null)

  useEffect(()=>{loadMeldingen()},[])
  async function loadMeldingen(){setLoading(true);const token=localStorage.getItem('token');try{const res=await fetch('http://localhost:8000/api/meldingen/',{headers:{Authorization:`Bearer ${token}`}});const data=await res.json();setMeldingen(data.meldingen||[])}catch{}finally{setLoading(false)}}
  async function resolve(id:number){setActionId(id);const token=localStorage.getItem('token');await fetch(`http://localhost:8000/api/meldingen/${id}/resolve`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({note:resolveNote})});setMeldingen(prev=>prev.map(m=>m.id===id?{...m,status:'resolved',resolution_note:resolveNote}:m));setResolving(null);setResolveNote('');setActionId(null)}
  async function close(id:number){setActionId(id);const token=localStorage.getItem('token');await fetch(`http://localhost:8000/api/meldingen/${id}/close`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});setMeldingen(prev=>prev.map(m=>m.id===id?{...m,status:'closed'}:m));setActionId(null)}

  const pc=(p:string)=>({low:{color:'#64748B',bg:'#F1F5F9',rim:'rgba(100,116,139,0.2)',label:nl?'Laag':'Low'},normal:{color:S.blue,bg:S.blueLt,rim:'rgba(37,99,235,0.2)',label:nl?'Normaal':'Normal'},high:{color:S.amber,bg:S.amberLt,rim:'rgba(217,119,6,0.2)',label:nl?'Hoog':'High'},urgent:{color:S.red,bg:S.redLt,rim:'rgba(220,38,38,0.2)',label:'Urgent'}}[p]||{color:S.t3,bg:S.surface2,rim:S.border,label:p})
  const sc=(s:string)=>({open:{color:S.amber,label:nl?'Open':'Open'},resolved:{color:S.green,label:nl?'Opgelost':'Resolved'},closed:{color:S.t3,label:nl?'Gesloten':'Closed'}}[s]||{color:S.t3,label:s})
  const filterLabels={all:nl?'Alle':'All',open:nl?'Open':'Open',resolved:nl?'Opgelost':'Resolved',closed:nl?'Gesloten':'Closed'}

  const filtered=meldingen.filter(m=>filter==='all'||m.status===filter)
  const openCount=meldingen.filter(m=>m.status==='open').length
  const resolvedCount=meldingen.filter(m=>m.status==='resolved').length

  return (
    <div style={{minHeight:'100vh',background:S.bg,fontFamily:"'DM Sans', sans-serif"}}>
      <nav style={{background:S.surface,borderBottom:`1px solid ${S.border}`,height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',position:'sticky',top:0,zIndex:100,boxShadow:S.shadow}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <Link href="/dashboard" style={{color:S.t3,display:'flex'}}><ArrowLeft size={16}/></Link>
          <img src="/logo.svg" alt="Groundr" style={{height:'32px'}}/>
          <span style={{color:S.border}}>·</span>
          <span style={{fontSize:'13.5px',color:S.t2}}>{t('meldingen.title')}</span>
          {openCount>0&&<span style={{padding:'2px 8px',fontSize:'11px',fontWeight:500,background:S.amberLt,color:S.amber,border:'1px solid rgba(217,119,6,0.2)'}}>{openCount} {nl?'open':'open'}</span>}
        </div>
        <LanguageToggle/>
      </nav>

      <div style={{maxWidth:'860px',margin:'0 auto',padding:'32px'}}>
        <div style={{marginBottom:'24px'}}>
          <h1 style={{fontSize:'22px',fontWeight:600,color:S.t1,letterSpacing:'-0.3px'}}>{t('meldingen.title')}</h1>
          <p style={{fontSize:'13px',color:S.t3,marginTop:'3px'}}>{nl?'Problemen en meldingen van kopers en verkopers':'Issues and reports from buyers and sellers'}</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0,background:S.border,border:`1px solid ${S.border}`,marginBottom:'24px',boxShadow:S.shadow}}>
          {[{label:t('meldingen.open'),value:openCount,color:S.amber},{label:t('meldingen.resolved'),value:resolvedCount,color:S.green},{label:nl?'Totaal':'Total',value:meldingen.length,color:S.t1}].map((s,i)=>(
            <div key={i} style={{background:S.surface,padding:'18px 20px'}}>
              <div style={{fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'6px'}}>{s.label}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:'24px',fontWeight:500,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',borderBottom:`1px solid ${S.border}`,marginBottom:'24px'}}>
          {(['all','open','resolved','closed'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'0 14px',height:'42px',fontSize:'13.5px',fontWeight:filter===f?500:400,color:filter===f?S.t1:S.t3,background:'none',border:'none',borderBottom:filter===f?`2px solid ${S.green}`:'2px solid transparent',cursor:'pointer',marginBottom:'-1px'}}>
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {loading&&<div style={{textAlign:'center',padding:'48px',color:S.t3,fontSize:'13px'}}>{t('common.loading')}</div>}

        {!loading&&filtered.length===0&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'64px 0',textAlign:'center'}}>
            <div style={{width:'48px',height:'48px',background:S.surface,border:`1px solid ${S.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'14px',boxShadow:S.shadow}}><AlertTriangle size={22} color={S.green}/></div>
            <p style={{fontSize:'15px',fontWeight:600,color:S.t1,marginBottom:'4px'}}>{t('meldingen.empty')}</p>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {filtered.map(m=>{
            const p=pc(m.priority);const s=sc(m.status)
            return(
              <div key={m.id} style={{background:S.surface,border:`1px solid ${S.border}`,boxShadow:S.shadow,overflow:'hidden'}}>
                <div style={{padding:'14px 20px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'16px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'12px'}}>
                    <span style={{fontSize:'18px',flexShrink:0,marginTop:'1px'}}>{CAT_ICONS[m.category]||'📋'}</span>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
                        <span style={{fontSize:'14px',fontWeight:600,color:S.t1}}>{m.title}</span>
                        <span style={{padding:'2px 7px',fontSize:'10.5px',fontWeight:500,background:p.bg,color:p.color,border:`1px solid ${p.rim}`}}>{p.label}</span>
                      </div>
                      {m.property&&<div style={{fontSize:'12px',color:S.t3,display:'flex',alignItems:'center',gap:'3px'}}><MapPin size={10}/>{m.property.street} {m.property.house_number}, {m.property.city}</div>}
                    </div>
                  </div>
                  <span style={{fontSize:'12px',fontWeight:500,color:s.color,flexShrink:0}}>{s.label}</span>
                </div>

                <div style={{padding:'12px 20px',borderTop:`1px solid ${S.border}`,background:S.surface2}}>
                  <p style={{fontSize:'13px',color:S.t2}}>{m.description}</p>
                  {m.resolution_note&&<div style={{marginTop:'8px',padding:'8px 12px',background:S.greenLt,color:S.greenTx,border:`1px solid ${S.greenRim}`,fontSize:'12.5px'}}>{nl?'Oplossing:':'Resolution:'} {m.resolution_note}</div>}
                </div>

                <div style={{padding:'10px 20px',borderTop:`1px solid ${S.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:'12px',color:S.t3}}>{m.reporter.name||m.reporter.email} · {new Date(m.created_at).toLocaleDateString('nl-NL')}</div>
                  {m.status==='open'&&(
                    <div style={{display:'flex',gap:'6px'}}>
                      {resolving===m.id?(
                        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                          <input value={resolveNote} onChange={e=>setResolveNote(e.target.value)} placeholder={nl?'Oplossingsnotitie...':'Resolution note...'} style={{height:'28px',padding:'0 10px',background:S.surface,border:`1px solid ${S.border}`,fontFamily:'inherit',fontSize:'12.5px',color:S.t1,outline:'none',width:'180px'}}/>
                          <button onClick={()=>resolve(m.id)} disabled={actionId===m.id} style={{display:'flex',alignItems:'center',gap:'5px',height:'28px',padding:'0 10px',background:S.green,color:'white',border:`1px solid ${S.green}`,fontSize:'12px',fontWeight:500,cursor:'pointer'}}><CheckCircle size={12}/>{actionId===m.id?'...':nl?'Oplossen':'Resolve'}</button>
                          <button onClick={()=>setResolving(null)} style={{height:'28px',width:'28px',background:S.surface,border:`1px solid ${S.border}`,cursor:'pointer',color:S.t3,display:'flex',alignItems:'center',justifyContent:'center'}}><XCircle size={12}/></button>
                        </div>
                      ):(
                        <>
                          <button onClick={()=>setResolving(m.id)} style={{display:'flex',alignItems:'center',gap:'5px',height:'28px',padding:'0 10px',background:S.greenLt,color:S.greenTx,border:`1px solid ${S.greenRim}`,fontSize:'12px',fontWeight:500,cursor:'pointer'}}><CheckCircle size={12}/>{nl?'Oplossen':'Resolve'}</button>
                          <button onClick={()=>close(m.id)} disabled={actionId===m.id} style={{display:'flex',alignItems:'center',gap:'5px',height:'28px',padding:'0 10px',background:S.surface2,color:S.t2,border:`1px solid ${S.border}`,fontSize:'12px',fontWeight:500,cursor:'pointer'}}><XCircle size={12}/>{t('meldingen.closed')}</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
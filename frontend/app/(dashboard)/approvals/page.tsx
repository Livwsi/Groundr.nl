'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Home, MapPin, CheckCircle, XCircle } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const S = { bg:'#F4F6F9',surface:'#FFFFFF',surface2:'#F8FAFB',border:'#E2E5EA',t1:'#0B1320',t2:'#44546A',t3:'#8A9BB0',green:'#059669',greenLt:'#ECFDF5',greenTx:'#047857',greenRim:'rgba(5,150,105,0.2)',amber:'#D97706',amberLt:'#FFFBEB',red:'#DC2626',redLt:'#FEF2F2',shadow:'0 1px 3px rgba(11,19,32,0.06)' }

interface Submission {
  id:number;reference:string;status:string;urgency:string;asking_price:number|null;show_price:boolean;description:string|null;bid_deadline:string|null;created_at:string
  seller:{id:number;email:string;full_name:string|null}
  property:{id:number;street:string;house_number:string;city:string;area_m2:number|null}
}

function formatPrice(p:number){return new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(p)}

export default function ApprovalsPage() {
  const { t, lang } = useLanguage(); const nl = lang === 'nl'
  const [submissions,   setSubmissions]   = useState<Submission[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [actionLoading, setActionLoading] = useState<number|null>(null)
  const [rejectNote,    setRejectNote]    = useState('')
  const [rejectingId,   setRejectingId]   = useState<number|null>(null)

  useEffect(()=>{loadSubmissions()},[])

  async function loadSubmissions(){setLoading(true);try{const token=localStorage.getItem('token');const res=await fetch('http://localhost:8000/api/submissions/pending',{headers:{Authorization:`Bearer ${token}`}});const data=await res.json();setSubmissions(data.submissions||[])}catch{setError(t('common.error'))}finally{setLoading(false)}}
  async function handleApprove(id:number){setActionLoading(id);try{const token=localStorage.getItem('token');const res=await fetch(`http://localhost:8000/api/submissions/${id}/approve`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});if(res.ok)setSubmissions(prev=>prev.filter(s=>s.id!==id))}catch{setError(t('common.error'))}finally{setActionLoading(null)}}
  async function handleReject(id:number){setActionLoading(id);try{const token=localStorage.getItem('token');const res=await fetch(`http://localhost:8000/api/submissions/${id}/reject`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({note:rejectNote})});if(res.ok){setSubmissions(prev=>prev.filter(s=>s.id!==id));setRejectingId(null);setRejectNote('')}}catch{setError(t('common.error'))}finally{setActionLoading(null)}}

  const urgencyColor=(u:string)=>({normal:{color:S.green,bg:S.greenLt,rim:S.greenRim},urgent:{color:S.amber,bg:S.amberLt,rim:'rgba(217,119,6,0.2)'},asap:{color:S.red,bg:S.redLt,rim:'rgba(220,38,38,0.2)'}}[u]||{color:S.green,bg:S.greenLt,rim:S.greenRim})
  const urgencyLabel=(u:string)=>({normal:nl?'Normaal':'Normal',urgent:'Urgent',asap:nl?'Moet weg':'ASAP'}[u]||u)

  return (
    <div style={{minHeight:'100vh',background:S.bg,fontFamily:"'DM Sans', sans-serif"}}>
      <nav style={{background:S.surface,borderBottom:`1px solid ${S.border}`,height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',position:'sticky',top:0,zIndex:100,boxShadow:S.shadow}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <Link href="/dashboard" style={{color:S.t3,display:'flex',alignItems:'center'}}><ArrowLeft size={16}/></Link>
          <img src="/logo.svg" alt="Groundr" style={{height:'32px'}}/>
          <span style={{color:S.border}}>·</span>
          <span style={{fontSize:'13.5px',color:S.t2}}>{t('approvals.title')}</span>
          {submissions.length>0&&<span style={{padding:'2px 8px',fontSize:'11px',fontWeight:500,background:S.amberLt,color:S.amber,border:'1px solid rgba(217,119,6,0.2)'}}>{submissions.length} {nl?'wachtend':'pending'}</span>}
        </div>
        <LanguageToggle/>
      </nav>

      <div style={{maxWidth:'860px',margin:'0 auto',padding:'32px'}}>
        <div style={{marginBottom:'28px'}}>
          <h1 style={{fontSize:'22px',fontWeight:600,color:S.t1,letterSpacing:'-0.3px'}}>{t('approvals.pending')}</h1>
          <p style={{fontSize:'13px',color:S.t3,marginTop:'3px'}}>{nl?'Woningen die verkopers hebben aangemeld voor uw microsite.':'Properties submitted by sellers for your microsite.'}</p>
        </div>

        {error&&<div style={{background:S.redLt,border:'1px solid rgba(220,38,38,0.2)',color:S.red,fontSize:'13px',padding:'10px 14px',marginBottom:'20px'}}>{error}</div>}
        {loading&&<div style={{textAlign:'center',padding:'48px',color:S.t3,fontSize:'13px'}}>{t('common.loading')}</div>}

        {!loading&&submissions.length===0&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'64px 0',textAlign:'center'}}>
            <div style={{width:'48px',height:'48px',background:S.surface,border:`1px solid ${S.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'14px',boxShadow:S.shadow}}><CheckCircle size={22} color={S.green}/></div>
            <p style={{fontSize:'15px',fontWeight:600,color:S.t1,marginBottom:'4px'}}>{t('approvals.empty')}</p>
            <p style={{fontSize:'13px',color:S.t3}}>{nl?'Alle aanmeldingen zijn beoordeeld.':'All submissions have been reviewed.'}</p>
          </div>
        )}

        {!loading&&submissions.length>0&&(
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {submissions.map(sub=>{
              const uc=urgencyColor(sub.urgency)
              return(
                <div key={sub.id} style={{background:S.surface,border:`1px solid ${S.border}`,boxShadow:S.shadow,overflow:'hidden'}}>
                  <div style={{padding:'16px 20px',borderBottom:`1px solid ${S.border}`,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'16px'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
                      <div style={{width:'36px',height:'36px',background:S.greenLt,border:`1px solid ${S.greenRim}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Home size={16} color={S.green}/></div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
                          <span style={{fontSize:'14px',fontWeight:600,color:S.t1}}>{sub.property.street} {sub.property.house_number}</span>
                          <span style={{padding:'2px 7px',fontSize:'10.5px',fontWeight:500,background:uc.bg,color:uc.color,border:`1px solid ${uc.rim}`}}>{urgencyLabel(sub.urgency)}</span>
                        </div>
                        <div style={{fontSize:'12px',color:S.t3,display:'flex',alignItems:'center',gap:'3px'}}><MapPin size={10}/>{sub.property.city}{sub.property.area_m2&&` · ${sub.property.area_m2} m²`}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:'monospace',fontSize:'11.5px',color:S.green,fontWeight:500}}>{sub.reference}</div>
                      <div style={{fontSize:'11.5px',color:S.t3,marginTop:'2px'}}>{new Date(sub.created_at).toLocaleDateString('nl-NL')}</div>
                    </div>
                  </div>

                  <div style={{padding:'14px 20px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',borderBottom:`1px solid ${S.border}`,background:S.surface2}}>
                    <div><div style={{fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>{nl?'Verkoper':'Seller'}</div><div style={{fontSize:'13.5px',color:S.t1}}>{sub.seller.full_name||sub.seller.email}</div><div style={{fontSize:'12px',color:S.t3}}>{sub.seller.email}</div></div>
                    <div><div style={{fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>{nl?'Vraagprijs':'Asking price'}</div><div style={{fontFamily:'monospace',fontSize:'14px',color:S.t1}}>{sub.asking_price?formatPrice(sub.asking_price):<span style={{color:S.t3}}>{nl?'Open bieding':'Open bid'}</span>}</div></div>
                    <div><div style={{fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>{nl?'Deadline':'Deadline'}</div><div style={{fontSize:'13.5px',color:S.t1}}>{sub.bid_deadline?new Date(sub.bid_deadline).toLocaleDateString('nl-NL'):<span style={{color:S.t3}}>—</span>}</div></div>
                    {sub.description&&<div style={{gridColumn:'1/-1'}}><div style={{fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>{nl?'Omschrijving':'Description'}</div><div style={{fontSize:'13px',color:S.t2}}>{sub.description}</div></div>}
                  </div>

                  {rejectingId===sub.id&&(
                    <div style={{padding:'14px 20px',borderBottom:`1px solid ${S.border}`,background:'rgba(220,38,38,0.02)'}}>
                      <label style={{display:'block',fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>{nl?'Reden (optioneel)':'Reason (optional)'}</label>
                      <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder={nl?'Bijv. onvoldoende informatie...':'E.g. insufficient information...'} rows={2} style={{width:'100%',padding:'8px 12px',background:S.surface,border:`1px solid ${S.border}`,fontFamily:'inherit',fontSize:'13px',color:S.t1,outline:'none',resize:'none'}}/>
                    </div>
                  )}

                  <div style={{padding:'12px 20px',display:'flex',gap:'8px'}}>
                    {rejectingId===sub.id?(
                      <>
                        <button onClick={()=>handleReject(sub.id)} disabled={actionLoading===sub.id} style={{display:'flex',alignItems:'center',gap:'6px',height:'34px',padding:'0 14px',background:S.red,color:'white',border:`1px solid ${S.red}`,fontSize:'13px',fontWeight:500,cursor:'pointer',opacity:actionLoading===sub.id?0.6:1}}>
                          <XCircle size={13}/>{actionLoading===sub.id?'...':nl?'Definitief afwijzen':'Confirm rejection'}
                        </button>
                        <button onClick={()=>{setRejectingId(null);setRejectNote('')}} style={{height:'34px',padding:'0 12px',background:S.surface,color:S.t2,border:`1px solid ${S.border}`,fontSize:'13px',cursor:'pointer'}}>{t('common.cancel')}</button>
                      </>
                    ):(
                      <>
                        <button onClick={()=>handleApprove(sub.id)} disabled={actionLoading===sub.id} style={{display:'flex',alignItems:'center',gap:'6px',height:'34px',padding:'0 16px',background:S.green,color:'white',border:`1px solid ${S.green}`,fontSize:'13px',fontWeight:500,cursor:'pointer',opacity:actionLoading===sub.id?0.6:1}}>
                          <CheckCircle size={13}/>{actionLoading===sub.id?'...':t('approvals.approve')}
                        </button>
                        <button onClick={()=>setRejectingId(sub.id)} style={{display:'flex',alignItems:'center',gap:'6px',height:'34px',padding:'0 14px',background:S.redLt,color:S.red,border:'1px solid rgba(220,38,38,0.2)',fontSize:'13px',fontWeight:500,cursor:'pointer'}}>
                          <XCircle size={13}/>{t('approvals.reject')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
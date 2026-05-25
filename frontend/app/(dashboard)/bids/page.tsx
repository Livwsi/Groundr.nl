'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Home, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useLanguage } from '@/store/language'

const S = { bg:'#F4F6F9',surface:'#FFFFFF',surface2:'#F8FAFB',border:'#E2E5EA',t1:'#0B1320',t2:'#44546A',t3:'#8A9BB0',green:'#059669',greenLt:'#ECFDF5',greenTx:'#047857',greenRim:'rgba(5,150,105,0.2)',amber:'#D97706',amberLt:'#FFFBEB',red:'#DC2626',shadow:'0 1px 3px rgba(11,19,32,0.06)' }

interface Bid{amount:number;placed_at:string;updated_at:string|null}
interface Listing{id:number;reference:string;urgency:string;asking_price:number|null;show_price:boolean;bid_deadline:string|null;bid_count:number;highest_bid:number|null;bids?:Bid[];loadingBids?:boolean;expanded?:boolean;property:{street:string;house_number:string;city:string;area_m2:number|null}}

function formatPrice(p:number){return new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(p)}

export default function BidsDashboard() {
  const {t,lang}=useLanguage();const nl=lang==='nl'
  const [listings,setListings]=useState<Listing[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{loadListings()},[])

  async function loadListings(){setLoading(true);try{const res=await fetch('http://localhost:8000/api/submissions/public/1');const data=await res.json();setListings((data.listings||[]).map((l:any)=>({...l,expanded:false,loadingBids:false,bids:[]})))}catch{setError(t('common.error'))}finally{setLoading(false)}}

  async function toggleBids(id:number){
    setListings(prev=>prev.map(l=>l.id!==id?l:l.expanded?{...l,expanded:false}:{...l,expanded:true,loadingBids:true}))
    try{const token=localStorage.getItem('token');const res=await fetch(`http://localhost:8000/api/submissions/${id}/bids`,{headers:{Authorization:`Bearer ${token}`}});const data=await res.json();setListings(prev=>prev.map(l=>l.id===id?{...l,loadingBids:false,bids:data.bids||[],bid_count:data.count,highest_bid:data.highest_bid}:l))}
    catch{setListings(prev=>prev.map(l=>l.id===id?{...l,loadingBids:false}:l))}
  }

  const totalBids=listings.reduce((s,l)=>s+(l.bid_count||0),0)
  const highestBid=listings.reduce((m,l)=>Math.max(m,l.highest_bid||0),0)
  const urgencyColor=(u:string)=>({normal:{color:S.green,bg:S.greenLt,rim:S.greenRim},urgent:{color:S.amber,bg:S.amberLt,rim:'rgba(217,119,6,0.2)'},asap:{color:S.red,bg:'#FEF2F2',rim:'rgba(220,38,38,0.2)'}}[u]||{color:S.green,bg:S.greenLt,rim:S.greenRim})

  return (
    <div style={{minHeight:'100vh',background:S.bg,fontFamily:"'DM Sans', sans-serif"}}>
      <nav style={{background:S.surface,borderBottom:`1px solid ${S.border}`,height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',position:'sticky',top:0,zIndex:100,boxShadow:S.shadow}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <Link href="/dashboard" style={{color:S.t3,display:'flex'}}><ArrowLeft size={16}/></Link>
          <img src="/logo.svg" alt="Groundr" style={{height:'32px'}}/>
          <span style={{color:S.border}}>·</span>
          <span style={{fontSize:'13.5px',color:S.t2}}>{t('bids.title')}</span>
        </div>
        <LanguageToggle/>
      </nav>

      <div style={{maxWidth:'900px',margin:'0 auto',padding:'32px'}}>
        <div style={{marginBottom:'28px'}}>
          <h1 style={{fontSize:'22px',fontWeight:600,color:S.t1,letterSpacing:'-0.3px'}}>{nl?'Biedingen overzicht':'Bids overview'}</h1>
          <p style={{fontSize:'13px',color:S.t3,marginTop:'3px'}}>{nl?'Alle biedingen op uw actieve woningen':'All bids on your active properties'}</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0,background:S.border,border:`1px solid ${S.border}`,marginBottom:'28px',boxShadow:S.shadow}}>
          {[{label:nl?'Actieve listings':'Active listings',value:String(listings.length)},{label:nl?'Totaal biedingen':'Total bids',value:String(totalBids)},{label:nl?'Hoogste bod':'Highest bid',value:highestBid>0?formatPrice(highestBid):'—'}].map((s,i)=>(
            <div key={i} style={{background:S.surface,padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'8px'}}>{s.label}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:'26px',fontWeight:500,color:i===2&&highestBid>0?S.green:S.t1,letterSpacing:'-0.5px'}}>{s.value}</div>
            </div>
          ))}
        </div>

        {error&&<div style={{background:'#FEF2F2',border:'1px solid rgba(220,38,38,0.2)',color:S.red,fontSize:'13px',padding:'10px 14px',marginBottom:'20px'}}>{error}</div>}
        {loading&&<div style={{textAlign:'center',padding:'48px',color:S.t3,fontSize:'13px'}}>{t('common.loading')}</div>}

        {!loading&&listings.length===0&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'64px 0',textAlign:'center'}}>
            <div style={{width:'48px',height:'48px',background:S.surface,border:`1px solid ${S.border}`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'14px',boxShadow:S.shadow}}><TrendingUp size={22} color={S.green}/></div>
            <p style={{fontSize:'15px',fontWeight:600,color:S.t1,marginBottom:'4px'}}>{t('bids.empty')}</p>
            <p style={{fontSize:'13px',color:S.t3}}>{nl?'Keur aanmeldingen goed om biedingen te zien.':'Approve submissions to see bids.'}</p>
          </div>
        )}

        {!loading&&listings.length>0&&(
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {listings.map(listing=>{
              const uc=urgencyColor(listing.urgency)
              return(
                <div key={listing.id} style={{background:S.surface,border:`1px solid ${S.border}`,boxShadow:S.shadow,overflow:'hidden'}}>
                  <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'background 0.12s'}}
                    onClick={()=>toggleBids(listing.id)}
                    onMouseEnter={e=>(e.currentTarget.style.background=S.surface2)}
                    onMouseLeave={e=>(e.currentTarget.style.background=S.surface)}>
                    <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                      <div style={{width:'36px',height:'36px',background:S.greenLt,border:`1px solid ${S.greenRim}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Home size={16} color={S.green}/></div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
                          <span style={{fontSize:'14px',fontWeight:600,color:S.t1}}>{listing.property.street} {listing.property.house_number}</span>
                          <span style={{padding:'2px 7px',fontSize:'10.5px',fontWeight:500,background:uc.bg,color:uc.color,border:`1px solid ${uc.rim}`}}>{listing.urgency==='asap'?(nl?'Moet weg':'ASAP'):'Urgent'}</span>
                        </div>
                        <div style={{fontSize:'12px',color:S.t3,display:'flex',alignItems:'center',gap:'3px'}}><MapPin size={10}/>{listing.property.city}{listing.property.area_m2&&` · ${listing.property.area_m2} m²`}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'32px',flexShrink:0}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'11px',color:S.t3,marginBottom:'2px'}}>{nl?'Biedingen':'Bids'}</div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:'20px',fontWeight:500,color:S.t1}}>{listing.bid_count}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'11px',color:S.t3,marginBottom:'2px'}}>{nl?'Hoogste bod':'Highest bid'}</div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:'18px',fontWeight:500,color:listing.highest_bid?S.green:S.t3}}>{listing.highest_bid?formatPrice(listing.highest_bid):'—'}</div>
                      </div>
                      <div style={{color:S.t3}}>{listing.expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</div>
                    </div>
                  </div>

                  {listing.bid_deadline&&(
                    <div style={{padding:'6px 20px',borderTop:`1px solid ${S.border}`,display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:new Date(listing.bid_deadline)<new Date()?S.red:S.amber,background:S.surface2}}>
                      <Clock size={12}/>
                      {new Date(listing.bid_deadline)<new Date()?(nl?'Biedingstermijn verlopen':'Bidding period expired'):`${nl?'Deadline':'Deadline'}: ${new Date(listing.bid_deadline).toLocaleDateString('nl-NL')}`}
                    </div>
                  )}

                  {listing.expanded&&(
                    <div style={{borderTop:`1px solid ${S.border}`}}>
                      {listing.loadingBids?(
                        <div style={{textAlign:'center',padding:'24px',color:S.t3,fontSize:'13px'}}>{t('common.loading')}</div>
                      ):listing.bids&&listing.bids.length>0?(
                        <div>
                          <div style={{display:'grid',gridTemplateColumns:'48px 1fr 1fr',padding:'8px 20px',background:S.surface2,borderBottom:`1px solid ${S.border}`}}>
                            {['#',nl?'Bod bedrag':'Bid amount',nl?'Geplaatst op':'Placed on'].map((h,i)=>(
                              <div key={i} style={{fontSize:'10.5px',fontWeight:500,color:S.t3,textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</div>
                            ))}
                          </div>
                          {[...listing.bids].sort((a,b)=>b.amount-a.amount).map((bid,i)=>(
                            <div key={i} style={{display:'grid',gridTemplateColumns:'48px 1fr 1fr',padding:'12px 20px',borderBottom:i<listing.bids!.length-1?`1px solid ${S.border}`:'none',background:i===0?'rgba(5,150,105,0.03)':S.surface,alignItems:'center'}}>
                              <div style={{fontSize:'12px',color:S.t3}}>{i===0&&<span style={{color:S.green,fontWeight:600,marginRight:'4px'}}>★</span>}#{i+1}</div>
                              <div style={{fontFamily:"'DM Mono',monospace",fontSize:i===0?'16px':'14px',fontWeight:500,color:i===0?S.green:S.t1}}>
                                {formatPrice(bid.amount)}
                                {listing.asking_price&&bid.amount>listing.asking_price&&<span style={{fontSize:'11px',color:S.green,marginLeft:'8px',fontWeight:400}}>+{formatPrice(bid.amount-listing.asking_price)}</span>}
                              </div>
                              <div style={{fontSize:'12px',color:S.t3}}>{new Date(bid.placed_at).toLocaleDateString('nl-NL')}{bid.updated_at&&bid.updated_at!==bid.placed_at&&<span style={{marginLeft:'6px',opacity:0.6}}>({nl?'bijgewerkt':'updated'})</span>}</div>
                            </div>
                          ))}
                          <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',background:S.surface2,borderTop:`1px solid ${S.border}`}}>
                            <span style={{fontSize:'12px',color:S.t3}}>{listing.bids.length} {nl?'anonieme biedingen':'anonymous bids'}</span>
                            {listing.asking_price&&listing.highest_bid&&(
                              <span style={{fontSize:'12px',fontWeight:500,color:listing.highest_bid>=listing.asking_price?S.green:S.amber}}>
                                {listing.highest_bid>=listing.asking_price?`+${((listing.highest_bid/listing.asking_price-1)*100).toFixed(1)}%`:`-${((1-listing.highest_bid/listing.asking_price)*100).toFixed(1)}%`} {nl?'vs vraagprijs':'vs asking'}
                              </span>
                            )}
                          </div>
                        </div>
                      ):(
                        <div style={{textAlign:'center',padding:'24px',color:S.t3,fontSize:'13px'}}>{nl?'Nog geen biedingen op deze woning':'No bids on this property yet'}</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
import Link from "next/link";
import {getStripe} from "@/lib/stripe";

export const dynamic="force-dynamic";

async function getMembershipPrice(){
 const id=process.env.STRIPE_PRICE_ID_MONTHLY;
 if(!id||!process.env.STRIPE_SECRET_KEY)return null;
 try{
  const price=await getStripe().prices.retrieve(id);
  const minor=Number(price.unit_amount_decimal??price.unit_amount??0);
  if(!Number.isFinite(minor)||minor<0)return null;
  const amount=new Intl.NumberFormat("es-ES",{style:"currency",currency:price.currency.toUpperCase()}).format(minor/100);
  const interval=price.recurring?.interval;
  const intervalCount=price.recurring?.interval_count??1;
  const period=interval==="month"?(intervalCount===1?"mes":intervalCount+" meses"):interval==="year"?(intervalCount===1?"año":intervalCount+" años"):interval??"periodo";
  const tax=price.tax_behavior==="inclusive"?"Impuestos incluidos.":price.tax_behavior==="exclusive"?"Los impuestos aplicables pueden añadirse al precio.":"Los impuestos aplicables se mostrarán antes del pago.";
  return {amount,period,tax,active:price.active};
 }catch(error){console.error("Could not retrieve Stripe price:",error instanceof Error?error.message:"unknown");return null;}
}

export default async function PricingPage(){
 const price=await getMembershipPrice();
 return <><header className="top"><Link className="brand" href="/"><span className="pill">TS</span><span><strong>Teacher Sara AI</strong><small>Membership</small></span></Link><Link href="/">Back to home</Link></header>
 <main className="page wrap"><section className="panel"><p className="eyebrow">TRANSPARENT MEMBERSHIP</p><h1>Clear limits. No surprises.</h1><p className="muted">Start with a free allowance, then upgrade when you want more guided English practice. The price shown below is retrieved from the same Stripe subscription price used at checkout.</p>
 <div className="grid" style={{marginTop:24}}>
  <article className="card"><span className="pill">FREE BETA</span><h2>Try the coach</h2><p>10 AI text messages per calendar month.</p><p className="small">No payment method required.</p><Link className="btn secondary" href="/login">Create free account</Link></article>
  <article className="card"><span className="pill">INDIVIDUAL MEMBERSHIP</span><h2>More practice</h2>
   {price&&price.active?<><div style={{fontFamily:"Manrope",fontSize:30,fontWeight:800,margin:"12px 0 2px"}}>{price.amount}<span style={{fontSize:13,fontWeight:500,color:"#6a7d76"}}> / {price.period}</span></div><p className="small">{price.tax}</p></>:<><div style={{fontFamily:"Manrope",fontSize:22,fontWeight:800,margin:"12px 0"}}>Price being configured</div><p className="small">Paid checkout will open once the recurring EUR price and tax presentation have been configured in Stripe.</p></>}
   <ul><li>300 AI text messages per calendar month.</li><li>Up to 10 voice session starts per calendar month.</li><li>10-minute in-app voice session target.</li><li>Cambridge-style and Business English scenarios.</li></ul>
   {price&&price.active?<Link className="btn" href="/login">Create account to subscribe</Link>:<span className="small">No payment will be taken during the private beta.</span>}
  </article>
  <article className="card"><span className="pill">SCHOOLS & TEAMS</span><h2>Coming later</h2><p>Teacher-managed seats and organisational reporting will follow the individual pilot.</p></article>
 </div>
 <p className="small" style={{marginTop:22}}>Membership limits are provisional beta allowances. AI feedback may be imperfect and is not an official Cambridge assessment or certificate. <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
 </section></main></>;
}
import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {sameOrigin} from "@/lib/security";

export const runtime="nodejs";

export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin rejected."},{status:403});
 const auth=await getCurrentUser();if(!auth)return NextResponse.json({error:"Please sign in first."},{status:401});
 let body:{shareLearningNotes?:boolean};
 try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 if(typeof body.shareLearningNotes!=="boolean")return NextResponse.json({error:"Invalid preference."},{status:400});
 try{
  const admin=createAdminClient();
  const {data,error}=await admin.rpc("set_learning_notes_consent",{p_user_id:auth.user.id,p_enabled:body.shareLearningNotes});
  if(error||!data)return NextResponse.json({error:"Could not update your learning-notes preference."},{status:503});
  return NextResponse.json({shareLearningNotes:body.shareLearningNotes,deletedOnOptOut:!body.shareLearningNotes},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("Preference update failed:",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Could not update your preference."},{status:503});}
}
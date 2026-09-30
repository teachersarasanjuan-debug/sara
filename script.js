(() => {
const SITE="https://www.teachersara.es";
const PHOTO=SITE+"/assets/teacher-sara-photo.webp";
const LOGO=SITE+"/assets/teacher-sara-logo.webp";

const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#site-nav');
if(nav){
  const wanted=[
    ['online.html','Clases online'],
    ['ingles-profesionales-empresas.html','Profesionales']
  ];
  wanted.forEach(([href,label])=>{
    if(!nav.querySelector('a[href="'+href+'"]')){
      const a=document.createElement('a');a.href=href;a.textContent=label;
      const guide=nav.querySelector('a[href="guides.html"]');
      if(guide) nav.insertBefore(a,guide); else nav.appendChild(a);
    }
  });
}
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',open?'true':'false')});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')))}

function meta(name,content,attr='name'){
  let el=document.head.querySelector('meta['+attr+'="'+name+'"]');
  if(!el){el=document.createElement('meta');el.setAttribute(attr,name);document.head.appendChild(el)}
  el.setAttribute('content',content);
}
function link(rel,href,extra){
  let el=document.head.querySelector('link[rel="'+rel+'"][href="'+href+'"]');
  if(!el){el=document.createElement('link');el.rel=rel;el.href=href;Object.assign(el,extra||{});document.head.appendChild(el)}
}
function jsonLd(data){
  let el=document.head.querySelector('script[data-teacher-sara-seo]');
  if(!el){el=document.createElement('script');el.type='application/ld+json';el.dataset.teacherSaraSeo='';document.head.appendChild(el)}
  el.textContent=JSON.stringify(data);
}
function currentKey(){
  const p=location.pathname.replace(/\\/g,'/');
  if(/\/guia\/[^/]+\.html$/.test(p)) return 'guide:'+p.split('/').pop();
  const f=p.split('/').filter(Boolean).pop()||'index.html';
  return f==='index.html'&&p.endsWith('/index.html')?'index.html':f;
}
function breadcrumb(name,url,guide){
  const items=[{"@type":"ListItem","position":1,"name":"Inicio","item":SITE+"/"}];
  if(guide) items.push({"@type":"ListItem","position":2,"name":"Guía para familias","item":SITE+"/guides.html"});
  items.push({"@type":"ListItem","position":guide?3:2,"name":name,"item":url});
  return {"@type":"BreadcrumbList","itemListElement":items};
}
function addVisibleBreadcrumb(name,guide){
  if(document.querySelector('.breadcrumbs')) return;
  const main=document.querySelector('main'); if(!main) return;
  const nav=document.createElement('nav');
  nav.className='breadcrumbs wrap'; nav.setAttribute('aria-label','Migas de pan');
  const a=document.createElement('a'); a.href=guide?'../index.html':'index.html'; a.textContent='Inicio'; nav.appendChild(a);
  const s1=document.createElement('span'); s1.setAttribute('aria-hidden','true'); s1.textContent='›'; nav.appendChild(s1);
  if(guide){
    const g=document.createElement('a'); g.href='../guides.html'; g.textContent='Guía para familias'; nav.appendChild(g);
    const s2=document.createElement('span'); s2.setAttribute('aria-hidden','true'); s2.textContent='›'; nav.appendChild(s2);
  }
  const cur=document.createElement('span'); cur.textContent=name; nav.appendChild(cur);
  main.insertBefore(nav,main.firstElementChild);
}
function replaceTextTypos(){
  const root=document.body; if(!root||!root.ownerDocument) return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n=>{n.nodeValue=n.nodeValue.replace(/Contactoo/g,'Contacto').replace(/Contactoa/g,'Contacta')});
}
function seo(){
  const key=currentKey();
  document.documentElement.lang='es-ES';
  meta('author','Teacher Sara');
  meta('theme-color','#176b57');
  meta('robots',key==='privacy.html'?'noindex,follow':'index,follow,max-image-preview:large');
  link('preconnect','https://fonts.googleapis.com');
  link('preconnect','https://fonts.gstatic.com',{crossOrigin:'anonymous'});
  if(!document.head.querySelector('link[data-teacher-fonts]')){
    const f=document.createElement('link');f.rel='stylesheet';f.href='https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&display=swap';f.dataset.teacherFonts='';document.head.appendChild(f);
  }
  meta('og:type',key.startsWith('guide:')?'article':'website','property');
  meta('og:locale','es_ES','property');
  meta('og:site_name','Teacher Sara','property');
  meta('og:image',PHOTO,'property');
  meta('og:image:alt','Teacher Sara, profesora británica de inglés','property');
  meta('twitter:card','summary_large_image');
  meta('twitter:title',document.title);
  meta('twitter:description',(document.querySelector('meta[name="description"]')||{}).content||'Clases de inglés con Teacher Sara');
  meta('twitter:image',PHOTO);
  meta('twitter:image:alt','Teacher Sara, profesora británica de inglés');

  const desc=(document.querySelector('meta[name="description"]')||{}).content||'Clases de inglés para niños y adolescentes en San Juan de Alicante y Mutxamel.';
  const title=document.title;
  let canonical=document.querySelector('link[rel="canonical"]');
  if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
  const guideMap={
    'clases-ingles-ninos-san-juan-alicante.html':['Clases de inglés para niños en San Juan de Alicante',SITE+'/guia/clases-ingles-ninos-san-juan-alicante.html'],
    'apoyo-escolar-ingles-ninos.html':['Apoyo escolar de inglés para niños',SITE+'/guia/apoyo-escolar-ingles-ninos.html'],
    'ingles-6-8-anos.html':['Inglés para niños de 6 a 8 años',SITE+'/guia/ingles-6-8-anos.html'],
    'cambridge-ingles-adolescentes-alicante.html':['Cambridge English para adolescentes',SITE+'/guia/cambridge-ingles-adolescentes-alicante.html'],
    'clases-ingles-mutxamel-ninos.html':['Clases de inglés para niños en Mutxamel',SITE+'/guia/clases-ingles-mutxamel-ninos.html']
  };

  if(key==='index.html'){
    canonical.href=SITE+'/';
    jsonLd({"@context":"https://schema.org","@graph":[
      {"@type":"WebSite","@id":SITE+"/#website","url":SITE+"/","name":"Teacher Sara","inLanguage":"es-ES","publisher":{"@id":SITE+"/#business"}},
      {"@type":"WebPage","@id":SITE+"/#webpage","url":SITE+"/","name":title,"description":desc,"inLanguage":"es-ES","isPartOf":{"@id":SITE+"/#website"},"about":{"@id":SITE+"/#business"}},
      {"@type":"LocalBusiness","@id":SITE+"/#business","name":"Teacher Sara","url":SITE+"/","logo":LOGO,"image":[PHOTO,LOGO],"telephone":"+34624344964","description":"Clases de inglés para niños y adolescentes en San Juan de Alicante y Mutxamel, con grupos pequeños, clases individuales, apoyo escolar y preparación Cambridge.","areaServed":["Sant Joan d'Alacant","San Juan de Alicante","Mutxamel","Alicante"],"serviceType":["Clases de inglés para niños","Clases particulares de inglés","Apoyo escolar de inglés","Preparación Cambridge English"],"address":{"@type":"PostalAddress","addressLocality":"Sant Joan d'Alacant","addressRegion":"Alicante","addressCountry":"ES"},"knowsAbout":["English language teaching","English for children","English for teenagers","school English support","Cambridge English exam preparation"],"founder":{"@id":SITE+"/#sara"},"hasOfferCatalog":{"@type":"OfferCatalog","name":"Clases de inglés","itemListElement":[{"@type":"Offer","name":"Clase de grupo completo (4 alumnos)","price":"12.50","priceCurrency":"EUR"},{"@type":"Offer","name":"Clase individual","price":"25.00","priceCurrency":"EUR"}]},"additionalProperty":[{"@type":"PropertyValue","name":"Tamaño máximo del grupo","value":"4 alumnos"},{"@type":"PropertyValue","name":"Condición del precio de grupo","value":"12,50 € por alumno y clase cuando el grupo está completo con 4 alumnos"},{"@type":"PropertyValue","name":"Precio de clase individual","value":"25 € por clase"}]},
      {"@type":"Service","@id":SITE+"/#online-service","name":"Clases de inglés online","provider":{"@id":SITE+"/#business"},"areaServed":{"@type":"Country","name":"España"},"serviceType":"Clases de inglés online","availableChannel":{"@type":"ServiceChannel","serviceUrl":SITE+"/online.html","providesService":"Online"}},{"@type":"Service","@id":SITE+"/#business-english-service","name":"Inglés para profesionales y empresas online","provider":{"@id":SITE+"/#business"},"areaServed":{"@type":"Country","name":"España"},"serviceType":"Inglés profesional y formación en inglés para empresas","availableChannel":{"@type":"ServiceChannel","serviceUrl":SITE+"/ingles-profesionales-empresas.html","providesService":"Online"}},{"@type":"Person","@id":SITE+"/#sara","name":"Sara","jobTitle":"Profesora británica de inglés","description":"Profesora británica de inglés con más de 15 años de experiencia enseñando en España.","image":PHOTO,"worksFor":{"@id":SITE+"/#business"}}
    ]});
    return;
  }

  if(key.startsWith('guide:')){
    const info=guideMap[key.slice(6)];
    if(!info) return;
    const url=info[1],name=info[0];
    canonical.href=url;
    jsonLd({"@context":"https://schema.org","@graph":[
      {"@type":"Article","headline":title,"description":desc,"mainEntityOfPage":{"@type":"WebPage","@id":url},"author":{"@id":SITE+"/#sara"},"publisher":{"@id":SITE+"/#business"},"image":PHOTO,"datePublished":"2026-09-29","dateModified":"2026-09-29","inLanguage":"es-ES"},
      {"@type":"WebPage","@id":url+"#webpage","url":url,"name":title,"description":desc,"inLanguage":"es-ES","isPartOf":{"@id":SITE+"/#website"},"about":{"@id":SITE+"/#business"}},
      breadcrumb(name,url,true)
    ]});
    addVisibleBreadcrumb(name,true);
    return;
  }

  const cfg={
    'classes.html':['Clases y precios',SITE+'/classes.html'],
    'about.html':['Sobre Sara',SITE+'/about.html'],
    'cambridge.html':['Cambridge',SITE+'/cambridge.html'],
    'faq.html':['Preguntas frecuentes',SITE+'/faq.html'],
    'contact.html':['Contacto',SITE+'/contact.html'],
    'guides.html':['Guía para familias',SITE+'/guides.html'],
    'online.html':['Clases online',SITE+'/online.html'],
    'clases-ingles-online-ninos.html':['Clases de inglés online para niños',SITE+'/clases-ingles-online-ninos.html'],
    'ingles-profesionales-empresas.html':['Profesionales y empresas',SITE+'/ingles-profesionales-empresas.html'],
    'online.html':['Clases online',SITE+'/online.html'],
    'clases-ingles-online-ninos.html':['Clases de inglés online para niños',SITE+'/clases-ingles-online-ninos.html'],
    'ingles-profesionales-empresas.html':['Profesionales y empresas',SITE+'/ingles-profesionales-empresas.html']
  };
  if(key==='privacy.html'){
    canonical.href=SITE+'/privacy.html';
    jsonLd({"@context":"https://schema.org","@type":"WebPage","@id":SITE+"/privacy.html#webpage","url":SITE+"/privacy.html","name":title,"description":desc,"inLanguage":"es-ES","isPartOf":{"@id":SITE+"/#website"}});
    addVisibleBreadcrumb('Privacidad',false);
    return;
  }
  if(!cfg[key]) return;
  canonical.href=cfg[key][1];
  addVisibleBreadcrumb(cfg[key][0],false);
  if(key==='about.html'){
    jsonLd({"@context":"https://schema.org","@graph":[
      {"@type":"ProfilePage","@id":SITE+"/about.html#webpage","url":SITE+"/about.html","name":title,"description":desc,"inLanguage":"es-ES","mainEntity":{"@id":SITE+"/#sara"},"isPartOf":{"@id":SITE+"/#website"}},
      {"@type":"Person","@id":SITE+"/#sara","name":"Sara","jobTitle":"Profesora británica de inglés","description":"Profesora británica de inglés con más de 15 años de experiencia enseñando en España.","image":PHOTO,"worksFor":{"@id":SITE+"/#business"}},
      breadcrumb('Sobre Sara',SITE+'/about.html',false)
    ]});
  } else if(key==='cambridge.html'){
    jsonLd({"@context":"https://schema.org","@graph":[
      {"@type":"Service","@id":SITE+"/cambridge.html#service","name":"Preparación Cambridge","provider":{"@id":SITE+"/#business"},"url":SITE+"/cambridge.html","areaServed":["Sant Joan d'Alacant","Mutxamel","Alicante"],"serviceType":"Preparación de inglés para exámenes Cambridge"},
      {"@type":"WebPage","@id":SITE+"/cambridge.html#webpage","url":SITE+"/cambridge.html","name":title,"description":desc,"inLanguage":"es-ES","isPartOf":{"@id":SITE+"/#website"},"mainEntity":{"@id":SITE+"/cambridge.html#service"}},
      breadcrumb('Cambridge',SITE+'/cambridge.html',false)
    ]});
    if(nav&&!nav.querySelector('a[href="guides.html"]')){
      const a=document.createElement('a');a.href='guides.html';a.textContent='Guía';nav.insertBefore(a,nav.querySelector('a[href="faq.html"]'));
    }
  } else if(key==='contact.html'){
    jsonLd({"@context":"https://schema.org","@graph":[
      {"@type":"ContactPage","@id":SITE+"/contact.html#webpage","url":SITE+"/contact.html","name":title,"description":desc,"inLanguage":"es-ES","isPartOf":{"@id":SITE+"/#website"},"about":{"@id":SITE+"/#business"}},
      breadcrumb('Contacto',SITE+'/contact.html',false)
    ]});
  } else if(key==='faq.html'){
    const faq={"@type":"FAQPage","@id":SITE+"/faq.html#faq"};
    const src=document.head.querySelector('script[type="application/ld+json"]:not([data-teacher-sara-seo])');
    if(src){try{const old=JSON.parse(src.textContent);if(old.mainEntity)faq.mainEntity=old.mainEntity}catch{}}
    if(!faq.mainEntity) faq.mainEntity=[];
    jsonLd({"@context":"https://schema.org","@graph":[
      {"@type":"WebPage","@id":SITE+"/faq.html#webpage","url":SITE+"/faq.html","name":title,"description":desc,"inLanguage":"es-ES","isPartOf":{"@id":SITE+"/#website"},"mainEntity":{"@id":SITE+"/faq.html#faq"}},faq,breadcrumb('Preguntas frecuentes',SITE+'/faq.html',false)
    ]});
  } else if(key==='guides.html'){
    const items=[
      ['Clases de inglés para niños en San Juan de Alicante',SITE+'/guia/clases-ingles-ninos-san-juan-alicante.html'],
      ['Apoyo escolar de inglés para niños',SITE+'/guia/apoyo-escolar-ingles-ninos.html'],
      ['Inglés para niños de 6 a 8 años',SITE+'/guia/ingles-6-8-anos.html'],
      ['Cambridge English para adolescentes en Alicante',SITE+'/guia/cambridge-ingles-adolescentes-alicante.html'],
      ['Clases de inglés para niños en Mutxamel',SITE+'/guia/clases-ingles-mutxamel-ninos.html']
    ];
    jsonLd({"@context":"https://schema.org","@graph":[
      {"@type":"CollectionPage","@id":SITE+"/guides.html#webpage","url":SITE+"/guides.html","name":title,"description":desc,"inLanguage":"es-ES","isPartOf":{"@id":SITE+"/#website"},"mainEntity":{"@type":"ItemList","itemListElement":items.map((it,i)=>({"@type":"ListItem","position":i+1,"name":it[0],"url":it[1]}))}},
      breadcrumb('Guía para familias',SITE+'/guides.html',false)
    ]});
  } else if(key==='classes.html'){
    const items=[['Inglés 6–8 años',SITE+'/classes.html#6-8'],['Inglés 9–11 años',SITE+'/classes.html#9-11'],['Inglés 12–14 años',SITE+'/classes.html#12-14'],['Clases individuales',SITE+'/classes.html#individual']];
    jsonLd({"@context":"https://schema.org","@graph":[
      {"@type":"ItemList","name":"Clases de inglés Teacher Sara","itemListElement":items.map((it,i)=>({"@type":"ListItem","position":i+1,"name":it[0],"url":it[1]}))},
      {"@type":"WebPage","@id":SITE+"/classes.html#webpage","url":SITE+"/classes.html","name":title,"description":desc,"inLanguage":"es-ES","isPartOf":{"@id":SITE+"/#website"},"about":{"@id":SITE+"/#business"}},
      breadcrumb('Clases y precios',SITE+'/classes.html',false)
    ]});
  }
}
replaceTextTypos();
seo();

// Small visual cleanup: the home CTA previously contained the WhatsApp icon twice.
document.querySelectorAll('.outline-white').forEach(a=>{
  const icons=a.querySelectorAll('.wa-icon');
  if(icons.length>1) for(let i=1;i<icons.length;i++) icons[i].remove();
});
})();
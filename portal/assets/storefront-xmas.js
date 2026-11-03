/* Christmas & New Year: season picks first on the storefront.
 * DATA entries carry x = 1 (Christmas gifting), 2 (New Year desk & planning),
 * 3 (evergreen corporate gifts). Replaces the global filtered() from the page
 * script so paint() automatically uses it. */
(function(){
  var mode='first'; // first | only | off
  var orig=window.filtered;
  if(typeof orig!=='function'||typeof DATA==='undefined') return;
  // Diwali-themed products are hidden for the Christmas & New Year season.
  var HIDE=/diwali|deepavali|\bdiya\b|diyas|pooja|puja|rakhi/i;
  window.filtered=function(){
    var r=orig().filter(function(d){return !HIDE.test(d.n)});
    if(mode==='off') return r;
    var picks=r.filter(function(d){return d.x}), rest=r.filter(function(d){return !d.x});
    if(mode==='only') return picks.sort(function(a,b){return $('sort').value==='pa'?(a.x-b.x||a.p-b.p):0});
    if($('sort').value==='pa') picks.sort(function(a,b){return a.x-b.x||a.p-b.p});
    return picks.concat(rest);
  };
  var n=DATA.filter(function(d){return d.x&&!HIDE.test(d.n)}).length;
  var bar=document.querySelector('.bar');
  var box=document.createElement('div');box.className='xs-mode';
  box.innerHTML='<button type="button" data-m="first" class="on">🎄 Season picks first</button><button type="button" data-m="only">Only season picks ('+n.toLocaleString('en-IN')+')</button><button type="button" data-m="off">All products</button>';
  bar.appendChild(box);
  box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;mode=b.dataset.m;
    [].forEach.call(box.children,function(x){x.classList.toggle('on',x===b)});shown=60;paint();});
  var go=document.querySelector('.festive-button');
  if(go)go.addEventListener('click',function(){mode='first';[].forEach.call(box.children,function(x){x.classList.toggle('on',x.dataset.m==='first')});shown=60;paint();});
  // badge on each season pick
  var cardHtml=window.card;
  if(typeof cardHtml==='function'){
    window.card=function(d){
      var h=cardHtml(d);
      if(!d.x||mode==='off') return h;
      var t=d.x===2?'New Year pick':'Christmas pick';
      return h.replace('<div class="ph">','<div class="ph"><span class="xs-pick'+(d.x===2?' ny':'')+'">🎄 '+t+'</span>');
    };
  }
  shown=60;paint();
})();

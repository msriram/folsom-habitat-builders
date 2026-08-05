export function attachDirectPhotoEditor({frame,image,zoom,horizontal,vertical,enabled,onChange}){
  let drag=null;
  const number=control=>Number(control.value);
  const clamp=(control,value)=>Math.min(Number(control.max),Math.max(Number(control.min),value));
  const active=()=>Boolean(enabled?.());

  const apply=()=>{
    image.style.transform=`scale(${number(zoom)})`;
    image.style.transformOrigin=`${number(horizontal)}% ${number(vertical)}%`;
    frame.classList.toggle('photo-editable',active());
    frame.setAttribute('aria-description',active()?'Scroll to zoom. Drag to reposition.':'');
  };

  const changed=kind=>{
    apply();
    onChange?.(kind);
  };

  image.addEventListener('dragstart',event=>event.preventDefault());
  frame.addEventListener('wheel',event=>{
    if(!active())return;
    event.preventDefault();
    const delta=Math.max(-.15,Math.min(.15,-event.deltaY*.002));
    zoom.value=String(clamp(zoom,number(zoom)+delta));
    changed('zoom');
  },{passive:false});

  frame.addEventListener('pointerdown',event=>{
    if(!active()||(event.button!==undefined&&event.button!==0))return;
    event.preventDefault();
    drag={pointerId:event.pointerId,startClientX:event.clientX,startClientY:event.clientY,startX:number(horizontal),startY:number(vertical)};
    frame.setPointerCapture?.(event.pointerId);
    frame.classList.add('dragging');
  });

  frame.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    event.preventDefault();
    const bounds=frame.getBoundingClientRect();
    const sensitivity=100/Math.max(1,number(zoom));
    horizontal.value=String(clamp(horizontal,drag.startX-(event.clientX-drag.startClientX)/bounds.width*sensitivity));
    vertical.value=String(clamp(vertical,drag.startY-(event.clientY-drag.startClientY)/bounds.height*sensitivity));
    changed('move');
  });

  const stopDrag=event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    frame.releasePointerCapture?.(event.pointerId);
    drag=null;
    frame.classList.remove('dragging');
  };
  frame.addEventListener('pointerup',stopDrag);
  frame.addEventListener('pointercancel',stopDrag);

  apply();
  return {apply};
}

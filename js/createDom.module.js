export function createdom(ele,parent,text,classes,id,href,src,alt,cssText)
{
    let myobj = document.createElement(ele)
    parent.appendChild(myobj)
    if (text) myobj.innerHTML = text;
    if (classes) myobj.className = classes;
    if (id) myobj.id = id;
    if (href) myobj.setAttribute("href",href);
    if (src) myobj.setAttribute("src",src);
    if (alt) myobj.setAttribute("alt",alt);
    if(cssText) myobj.style.cssText = cssText
    return myobj;
}
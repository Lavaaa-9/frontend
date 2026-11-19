import { useEffect, useState } from 'react'

export function parseRoute(hash:string) {
  const value=hash.startsWith('#/')?hash.slice(2):'terminals'
  const [section,detail]=value.split('/').map(part=>{try{return decodeURIComponent(part)}catch{return ''}})
  return {section:section||'terminals',detail:detail||''}
}
export function useHashRoute() {
  const [route,setRoute]=useState(()=>parseRoute(location.hash))
  useEffect(()=>{const changed=()=>setRoute(parseRoute(location.hash));window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed)},[])
  function navigate(section:string,detail='') {location.hash=`/${encodeURIComponent(section)}${detail?`/${encodeURIComponent(detail)}`:''}`}
  return [route,navigate] as const
}

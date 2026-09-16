// undefined means automatic subscription handling; null explicitly denies VIP.
export function canonicalVip(player) {
  if (!player || typeof player.effective_vip_active !== 'boolean') throw new Error('VIP service needs the updated player API.');
  if (player.owner_vip) return {source:'owner_override',ownerOverride:true,expiresAt:0,testMode:false,vip:{id:Number(player.tip4serv_user_id),status:'active',onetime:false,unsubscribed:false}};
  if (player.vip_admin_override) {
    if (!player.effective_vip_active) return null;
    return {source:'admin',adminOverride:true,expiresAt:player.vip_expires_at ? Date.parse(player.vip_expires_at) : 0,testMode:false,vip:{id:null,status:'active',onetime:true,unsubscribed:false}};
  }
  return undefined;
}

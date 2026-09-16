import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalVip} from '../server/canonicalVip.js';
test('saved VIP state controls storefront entitlement without reviving disabled owner VIP',()=>{
 const p={tip4serv_user_id:'228127',owner_vip:true,vip_admin_override:true,effective_vip_active:true};
 assert.equal(canonicalVip(p).ownerOverride,true);
 assert.equal(canonicalVip({...p,owner_vip:false,effective_vip_active:false}),null);
 assert.equal(canonicalVip({...p,owner_vip:false}).adminOverride,true);
 assert.equal(canonicalVip({...p,owner_vip:false,vip_admin_override:false}),undefined);
 assert.throws(()=>canonicalVip({tip4serv_user_id:'228127'}));
});

import axios from 'axios'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { AdminContext } from '../../context/AdminContext'
import { publicEnv } from '../../lib/env'

const Memberships = () => {
  const backendUrl = publicEnv.backendUrl
  const { aToken } = useContext(AdminContext)
  const headers = useMemo(() => ({ Authorization: `Bearer ${aToken}` }), [aToken])
  const [organization, setOrganization] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [form, setForm] = useState({
    accountId: '',
    accountType: 'doctor',
    role: 'DOCTOR',
    status: 'ACTIVE',
    scopedPermissions: ''
  })

  const loadMemberships = useCallback(async () => {
    const orgResponse = await axios.get(backendUrl + '/api/v1/organizations/current', { headers })
    const currentOrg = orgResponse.data.data.organization
    setOrganization(currentOrg)
    const memberResponse = await axios.get(backendUrl + `/api/v1/organizations/${currentOrg._id}/memberships`, { headers })
    setMemberships(memberResponse.data.data.memberships)
  }, [backendUrl, headers])

  useEffect(() => {
    if (aToken) {
      loadMemberships().catch((error) => toast.error(error.response?.data?.message || error.message))
    }
  }, [aToken, loadMemberships])

  const submitMembership = async (event) => {
    event.preventDefault()
    if (!organization?._id) return
    await axios.put(backendUrl + `/api/v1/organizations/${organization._id}/memberships`, {
      accountId: form.accountId,
      accountType: form.accountType,
      role: form.role,
      status: form.status,
      scopedPermissions: form.scopedPermissions.split(',').map((item) => item.trim()).filter(Boolean)
    }, { headers })
    setForm({ ...form, accountId: '', scopedPermissions: '' })
    await loadMemberships()
  }

  return (
    <main className='portal-page max-w-5xl text-slate-600'>
      <div><p className='portal-eyebrow'>Tenant access</p><h1 className='portal-title'>{organization?.name || 'Organization'} memberships</h1><p className='mt-2'>Assign tenant-scoped roles and preserve least-privilege access.</p></div>
      <form onSubmit={submitMembership} className='portal-card p-5 grid md:grid-cols-5 gap-3'>
        <input value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className='portal-field' placeholder='Account ID' required />
        <select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} className='portal-field'>
          <option value='doctor'>Doctor</option>
          <option value='patient'>Patient</option>
          <option value='admin'>Admin</option>
        </select>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className='portal-field'>
          <option value='DOCTOR'>Doctor</option>
          <option value='STAFF'>Staff</option>
          <option value='PATIENT'>Patient</option>
          <option value='HOSPITAL_ADMIN'>Hospital admin</option>
        </select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className='portal-field'>
          <option value='ACTIVE'>Active</option>
          <option value='INVITED'>Invited</option>
          <option value='SUSPENDED'>Suspended</option>
          <option value='REVOKED'>Revoked</option>
        </select>
        <button className='portal-button'>Save membership</button>
        <input value={form.scopedPermissions} onChange={(e) => setForm({ ...form, scopedPermissions: e.target.value })} className='portal-field md:col-span-5' placeholder='Scoped permissions, comma separated' />
      </form>
      <div className='portal-card overflow-hidden'>
        {memberships.map((membership) => <div key={membership._id} className='grid md:grid-cols-5 gap-2 p-4 border-b border-line text-sm'>
          <p>{membership.accountType}</p>
          <p className='truncate'>{membership.accountId}</p>
          <p>{membership.role}</p>
          <p><span className='portal-status bg-[#E7F4F5] text-primary'>{membership.status}</span></p>
          <p>{membership.scopedPermissions?.join(', ')}</p>
        </div>)}
        {memberships.length === 0 && <p className='p-8 text-center text-slate-500'>No memberships are currently available.</p>}
      </div>
    </main>
  )
}

export default Memberships

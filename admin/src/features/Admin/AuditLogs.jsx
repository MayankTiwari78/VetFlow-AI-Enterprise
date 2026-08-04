import axios from 'axios'
import { useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { AdminContext } from '../../context/AdminContext'
import { publicEnv } from '../../lib/env'

const AuditLogs = () => {
  const backendUrl = publicEnv.backendUrl
  const { aToken } = useContext(AdminContext)
  const [auditLogs, setAuditLogs] = useState([])
  const [eventType, setEventType] = useState('')

  const loadAuditLogs = useCallback(async () => {
    const { data } = await axios.get(backendUrl + '/api/v1/audit-logs', {
      headers: { Authorization: `Bearer ${aToken}` },
      params: { eventType: eventType || undefined, limit: 50, offset: 0 }
    })
    setAuditLogs(data.data.auditLogs)
  }, [aToken, backendUrl, eventType])

  useEffect(() => {
    if (aToken) {
      loadAuditLogs().catch((error) => toast.error(error.response?.data?.message || error.message))
    }
  }, [aToken, loadAuditLogs])

  return (
    <main className='portal-page max-w-5xl text-slate-600'>
      <div><p className='portal-eyebrow'>Security operations</p><h1 className='portal-title'>Audit logs</h1><p className='mt-2'>Review tenant-scoped security events and sensitive administrative activity.</p></div>
      <div className='flex flex-wrap gap-3 items-center'>
        <input value={eventType} onChange={(e) => setEventType(e.target.value)} className='portal-field max-w-sm' placeholder='Event type filter' />
        <button onClick={loadAuditLogs} className='portal-button'>Filter events</button>
      </div>
      <div className='portal-card overflow-hidden'>
        {auditLogs.map((entry) => <div key={entry._id || entry.createdAt} className='grid md:grid-cols-[1fr_1fr_1fr] gap-2 p-4 border-b border-line text-sm'>
          <p className='font-semibold text-ink'>{entry.eventType}</p>
          <p>{entry.actor?.accountType || 'system'} {entry.actor?.accountId || ''}</p>
          <p>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}</p>
        </div>)}
        {auditLogs.length === 0 && <p className='p-8 text-center text-slate-500'>No audit events match the current filter.</p>}
      </div>
    </main>
  )
}

export default AuditLogs

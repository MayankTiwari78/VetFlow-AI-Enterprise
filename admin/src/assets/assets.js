import add_icon from './add_icon.svg'
import admin_logo from './admin_logo.svg'
import appointment_icon from './appointment_icon.svg'
import cancel_icon from './cancel_icon.svg'
import doctor_icon from './doctor_icon.svg'
import home_icon from './home_icon.svg'
import people_icon from './people_icon.svg'
import upload_area from './upload_area.svg'
import list_icon from './list_icon.svg'
import tick_icon from './tick_icon.svg'
import appointments_icon from './appointments_icon.svg'
import earning_icon from './earning_icon.svg'
import patients_icon from './patients_icon.svg'

const assetUrl = (asset) => typeof asset === 'string' ? asset : asset?.src

export const assets = {
    add_icon: assetUrl(add_icon),
    admin_logo: assetUrl(admin_logo),
    appointment_icon: assetUrl(appointment_icon),
    cancel_icon: assetUrl(cancel_icon),
    doctor_icon: assetUrl(doctor_icon),
    upload_area: assetUrl(upload_area),
    home_icon: assetUrl(home_icon),
    patients_icon: assetUrl(patients_icon),
    people_icon: assetUrl(people_icon),
    list_icon: assetUrl(list_icon),
    tick_icon: assetUrl(tick_icon),
    appointments_icon: assetUrl(appointments_icon),
    earning_icon: assetUrl(earning_icon)
}

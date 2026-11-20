'use client';
import { useId, useState } from 'react';
import {
  UserRound,
  Mail,
  KeyRound,
  Phone,
  BriefcaseBusiness,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { Input } from './ui/input';

type Draft = {
  name: string;
  email: string;
  password: string;
  phone: string;
  expertise?: string;
  venture?: string;
};
export function PersonFields({
  kind,
  value,
  onChange,
}: {
  kind: 'mentor' | 'mentee';
  value: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <>
      <div className="form-section-heading">
        <span>01</span>
        <h3>Identidad y acceso</h3>
        <ShieldCheck size={16} />
      </div>
      <label htmlFor={`${id}-name`} className="form-field">
        <span>Nombre completo</span>
        <div className="input-with-icon">
          <UserRound />
          <Input
            id={`${id}-name`}
            required
            maxLength={100}
            placeholder="Nombre y apellidos"
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${id}-email`} className="form-field">
          <span>Correo para ingresar</span>
          <div className="input-with-icon">
            <Mail />
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="off"
              required
              maxLength={254}
              placeholder="nombre@ejemplo.cl"
              value={value.email}
              onChange={(event) => onChange({ email: event.target.value })}
            />
          </div>
        </label>
        <div className="form-field">
          <label htmlFor={`${id}-password`}>Contraseña inicial</label>
          <div className="input-with-icon">
            <KeyRound />
            <Input
              id={`${id}-password`}
              className="pr-12"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              placeholder="Al menos 8 caracteres"
              value={value.password}
              onChange={(event) => onChange({ password: event.target.value })}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={show}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
      </div>
      <div className="form-section-heading mt-2">
        <span>02</span>
        <h3>Datos complementarios</h3>
        <small>Opcional</small>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${id}-detail`} className="form-field">
          <span>{kind === 'mentor' ? 'Especialidades' : 'Emprendimiento'}</span>
          <div className="input-with-icon">
            {kind === 'mentor' ? <Sparkles /> : <BriefcaseBusiness />}
            <Input
              id={`${id}-detail`}
              maxLength={150}
              placeholder={
                kind === 'mentor'
                  ? 'Finanzas, ventas, gestión'
                  : 'Nombre del emprendimiento'
              }
              value={kind === 'mentor' ? value.expertise : value.venture}
              onChange={(event) =>
                onChange(
                  kind === 'mentor'
                    ? { expertise: event.target.value }
                    : { venture: event.target.value },
                )
              }
            />
          </div>
        </label>
        <label htmlFor={`${id}-phone`} className="form-field">
          <span>Teléfono</span>
          <div className="input-with-icon">
            <Phone />
            <Input
              id={`${id}-phone`}
              type="tel"
              maxLength={30}
              placeholder="+56 9 1234 5678"
              value={value.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
            />
          </div>
        </label>
      </div>
      <p className="form-note">
        <ShieldCheck size={17} />
        <span>
          Comparte el acceso con la persona. En su primer ingreso elegirá su
          propia contraseña. No enviamos correos.
        </span>
      </p>
    </>
  );
}

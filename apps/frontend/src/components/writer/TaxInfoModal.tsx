/**
 * Tax Info Modal
 * Collects W-9 (US) or W-8BEN (International) tax information
 * for 1099 reporting purposes via Stripe
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { paymentApi } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import { Button, TextInput, Select, SelectItem } from '@tremor/react';

interface TaxInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FormType = 'W9' | 'W8BEN';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const TAX_CLASSIFICATIONS = [
  { value: 'individual', label: 'Individual/Sole Proprietor' },
  { value: 'llc_single', label: 'Single-member LLC' },
  { value: 'llc_c', label: 'LLC (taxed as C-Corp)' },
  { value: 'llc_s', label: 'LLC (taxed as S-Corp)' },
  { value: 'c_corp', label: 'C Corporation' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust/Estate' },
];

const COUNTRIES = [
  'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway', 'Denmark',
  'Japan', 'South Korea', 'Brazil', 'Mexico', 'Other'
];

export function TaxInfoModal({ isOpen, onClose, onSuccess }: TaxInfoModalProps) {
  const [formType, setFormType] = useState<FormType>('W9');
  const [legalName, setLegalName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [taxClassification, setTaxClassification] = useState('individual');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [ssn, setSsn] = useState('');
  const [ein, setEin] = useState('');
  const [foreignTaxId, setForeignTaxId] = useState('');
  const [countryOfCitizenship, setCountryOfCitizenship] = useState('');
  const [error, setError] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      const data = {
        formType,
        legalName,
        businessName: businessName || undefined,
        taxClassification,
        address,
        city,
        state: formType === 'W9' ? state : undefined,
        zipCode,
        country: formType === 'W8BEN' ? country : 'US',
        ssn: formType === 'W9' ? ssn : undefined,
        ein: taxClassification !== 'individual' ? ein : undefined,
        foreignTaxId: formType === 'W8BEN' ? foreignTaxId : undefined,
        countryOfCitizenship: formType === 'W8BEN' ? countryOfCitizenship : undefined,
      };
      const response = await paymentApi.submitTaxInfo(data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to submit tax information');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!legalName.trim()) {
      setError('Legal name is required');
      return;
    }
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    if (!city.trim()) {
      setError('City is required');
      return;
    }
    if (!zipCode.trim()) {
      setError('ZIP/Postal code is required');
      return;
    }

    if (formType === 'W9') {
      if (!state) {
        setError('State is required');
        return;
      }
      if (!ssn.trim() && taxClassification === 'individual') {
        setError('SSN is required for individuals');
        return;
      }
      if (taxClassification !== 'individual' && !ein.trim()) {
        setError('EIN is required for businesses');
        return;
      }
    } else {
      if (!country) {
        setError('Country is required');
        return;
      }
      if (!countryOfCitizenship) {
        setError('Country of citizenship is required');
        return;
      }
    }

    submitMutation.mutate();
  };

  const formatSSN = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as XXX-XX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const formatEIN = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as XX-XXXXXXX
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white border-gray-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Submit Tax Information</DialogTitle>
          <DialogDescription className="text-gray-500">
            This information is required for 1099 tax reporting. Your data is securely transmitted
            to Stripe and is not stored on our servers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Form Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Tax Form Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="formType"
                  value="W9"
                  checked={formType === 'W9'}
                  onChange={() => setFormType('W9')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">W-9 (US Person)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="formType"
                  value="W8BEN"
                  checked={formType === 'W8BEN'}
                  onChange={() => setFormType('W8BEN')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">W-8BEN (Non-US Person)</span>
              </label>
            </div>
          </div>

          {/* Legal Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Legal Name <span className="text-red-500">*</span>
            </label>
            <TextInput
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Enter your full legal name"
              className="bg-gray-50 border-gray-200"
            />
          </div>

          {/* Business Name (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Business Name <span className="text-gray-400">(if different)</span>
            </label>
            <TextInput
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter business name if applicable"
              className="bg-gray-50 border-gray-200"
            />
          </div>

          {/* Tax Classification (W-9 only) */}
          {formType === 'W9' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Tax Classification <span className="text-red-500">*</span>
              </label>
              <Select
                value={taxClassification}
                onValueChange={setTaxClassification}
                className="bg-gray-50 border-gray-200"
              >
                {TAX_CLASSIFICATIONS.map((tc) => (
                  <SelectItem key={tc.value} value={tc.value}>
                    {tc.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Street Address <span className="text-red-500">*</span>
            </label>
            <TextInput
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your street address"
              className="bg-gray-50 border-gray-200"
            />
          </div>

          {/* City, State/Country, ZIP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                City <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="bg-gray-50 border-gray-200"
              />
            </div>

            {formType === 'W9' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  State <span className="text-red-500">*</span>
                </label>
                <Select
                  value={state}
                  onValueChange={setState}
                  placeholder="Select state"
                  className="bg-gray-50 border-gray-200"
                >
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Country <span className="text-red-500">*</span>
                </label>
                <Select
                  value={country}
                  onValueChange={setCountry}
                  placeholder="Select country"
                  className="bg-gray-50 border-gray-200"
                >
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                ZIP/Postal Code <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder={formType === 'W9' ? 'ZIP Code' : 'Postal Code'}
                className="bg-gray-50 border-gray-200"
              />
            </div>

            {formType === 'W8BEN' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Country of Citizenship <span className="text-red-500">*</span>
                </label>
                <Select
                  value={countryOfCitizenship}
                  onValueChange={setCountryOfCitizenship}
                  placeholder="Select country"
                  className="bg-gray-50 border-gray-200"
                >
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Tax ID Section */}
          {formType === 'W9' ? (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900">Taxpayer Identification</h4>

              {taxClassification === 'individual' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Social Security Number (SSN) <span className="text-red-500">*</span>
                  </label>
                  <TextInput
                    type="password"
                    value={ssn}
                    onChange={(e) => setSsn(formatSSN(e.target.value))}
                    placeholder="XXX-XX-XXXX"
                    maxLength={11}
                    className="bg-gray-50 border-gray-200"
                  />
                  <p className="text-xs text-gray-500">
                    Your SSN is encrypted and securely transmitted to Stripe. We do not store your full SSN.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Employer Identification Number (EIN) <span className="text-red-500">*</span>
                  </label>
                  <TextInput
                    value={ein}
                    onChange={(e) => setEin(formatEIN(e.target.value))}
                    placeholder="XX-XXXXXXX"
                    maxLength={10}
                    className="bg-gray-50 border-gray-200"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900">Foreign Tax Identification</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Foreign Tax Identifying Number <span className="text-gray-400">(if any)</span>
                </label>
                <TextInput
                  value={foreignTaxId}
                  onChange={(e) => setForeignTaxId(e.target.value)}
                  placeholder="Enter your foreign tax ID"
                  className="bg-gray-50 border-gray-200"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Certification */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">
              By submitting this form, I certify under penalty of perjury that:
              {formType === 'W9' ? (
                <>
                  <br />1. The number shown on this form is my correct taxpayer identification number
                  <br />2. I am a U.S. citizen or other U.S. person
                  <br />3. I am not subject to backup withholding
                </>
              ) : (
                <>
                  <br />1. I am the beneficial owner of the income to which this form relates
                  <br />2. I am not a U.S. person
                  <br />3. The income is not effectively connected with a U.S. trade or business
                </>
              )}
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              Submit Tax Information
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

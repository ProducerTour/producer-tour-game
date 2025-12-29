import { Fragment, useState } from 'react';
import { Dialog, Transition, RadioGroup } from '@headlessui/react';
import { useMutation } from '@tanstack/react-query';
import { X, Flag, Loader2, AlertTriangle } from 'lucide-react';
import { feedApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'post' | 'comment' | 'user';
  entityId: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading', description: 'Fake engagement, scams, or repetitive content' },
  { value: 'harassment', label: 'Harassment or bullying', description: 'Targeting or intimidating individuals' },
  { value: 'inappropriate', label: 'Inappropriate content', description: 'Offensive, violent, or explicit material' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' },
] as const;

type ReportReason = typeof REPORT_REASONS[number]['value'];

export function ReportModal({ isOpen, onClose, entityType, entityId }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!reason) throw new Error('Please select a reason');
      return feedApi.report({
        entityType,
        entityId,
        reason,
        details: details.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Report submitted. Thank you for helping keep our community safe.');
      handleClose();
    },
    onError: () => {
      toast.error('Failed to submit report. Please try again.');
    },
  });

  const handleClose = () => {
    setReason(null);
    setDetails('');
    onClose();
  };

  const handleSubmit = () => {
    if (!reason) {
      toast.error('Please select a reason for your report');
      return;
    }
    reportMutation.mutate();
  };

  const entityLabel = entityType === 'post' ? 'post' : entityType === 'comment' ? 'comment' : 'user';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <Flag className="w-5 h-5 text-red-600" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Report {entityLabel}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Reports are reviewed by our support team. False reports may result in account restrictions.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Why are you reporting this {entityLabel}?
                    </label>
                    <RadioGroup value={reason} onChange={setReason} className="space-y-2">
                      {REPORT_REASONS.map((option) => (
                        <RadioGroup.Option
                          key={option.value}
                          value={option.value}
                          className={({ checked }) =>
                            `relative flex cursor-pointer rounded-lg border px-4 py-3 focus:outline-none transition-colors ${
                              checked
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`
                          }
                        >
                          {({ checked }) => (
                            <div className="flex items-start gap-3 w-full">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                                  checked
                                    ? 'border-purple-600 bg-purple-600'
                                    : 'border-gray-300'
                                }`}
                              >
                                {checked && (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{option.label}</p>
                                <p className="text-xs text-gray-500">{option.description}</p>
                              </div>
                            </div>
                          )}
                        </RadioGroup.Option>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Provide any additional context that might help us review this report..."
                      rows={3}
                      maxLength={1000}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{details.length}/1000</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={handleClose}
                    disabled={reportMutation.isPending}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || reportMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {reportMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Flag className="w-4 h-4" />
                        Submit Report
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

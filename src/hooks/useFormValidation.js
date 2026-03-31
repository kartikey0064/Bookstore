import { useCallback, useMemo, useState } from 'react';

export default function useFormValidation({ initialValues, stepFields, validators }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [currentStep, setCurrentStep] = useState(0);

  const validateField = useCallback((name, value, currentValues) => {
    const validator = validators[name];
    return validator ? validator(value, currentValues) : '';
  }, [validators]);

  const recomputeTouchedErrors = useCallback((nextValues, nextTouched) => {
    const nextErrors = {};
    Object.keys(nextTouched).forEach(field => {
      if (nextTouched[field]) {
        nextErrors[field] = validateField(field, nextValues[field], nextValues);
      }
    });
    return nextErrors;
  }, [validateField]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);

    if (Object.values(touched).some(Boolean)) {
      setErrors(current => ({
        ...current,
        ...recomputeTouchedErrors(nextValues, touched),
      }));
    }
  }, [recomputeTouchedErrors, touched, values]);

  const handleBlur = useCallback((event) => {
    const { name, value } = event.target;
    const nextTouched = { ...touched, [name]: true };
    setTouched(nextTouched);
    setErrors(current => ({
      ...current,
      ...recomputeTouchedErrors({ ...values, [name]: value }, nextTouched),
    }));
  }, [recomputeTouchedErrors, touched, values]);

  const fieldState = useCallback((name) => {
    if (!touched[name]) return '';
    if (errors[name]) return 'error';
    if ((values[name] ?? '') === '') return '';
    return errors[name] ? 'error' : 'success';
  }, [errors, touched, values]);

  const validateStep = useCallback((stepIndex = currentStep) => {
    const fields = stepFields[stepIndex] || [];
    const nextTouched = { ...touched };
    const nextErrors = { ...errors };

    fields.forEach(field => {
      nextTouched[field] = true;
      nextErrors[field] = validateField(field, values[field], values);
    });

    setTouched(nextTouched);
    setErrors(nextErrors);
    return fields.every(field => !nextErrors[field]);
  }, [currentStep, errors, stepFields, touched, validateField, values]);

  const goNext = useCallback(() => {
    if (!validateStep()) {
      return false;
    }
    setCurrentStep(step => Math.min(step + 1, stepFields.length - 1));
    return true;
  }, [stepFields.length, validateStep]);

  const goBack = useCallback(() => {
    setCurrentStep(step => Math.max(step - 1, 0));
  }, []);

  const goToStep = useCallback((stepIndex) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
      return true;
    }

    if (!validateStep(currentStep)) {
      return false;
    }

    setCurrentStep(stepIndex);
    return true;
  }, [currentStep, validateStep]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setCurrentStep(0);
  }, [initialValues]);

  const isStepComplete = useCallback((stepIndex) => {
    const fields = stepFields[stepIndex] || [];
    return fields.length > 0 && fields.every(field => touched[field] && !validateField(field, values[field], values));
  }, [stepFields, touched, validateField, values]);

  const visibleErrors = useMemo(() => errors, [errors]);

  return {
    currentStep,
    errors: visibleErrors,
    fieldState,
    goBack,
    goNext,
    goToStep,
    handleBlur,
    handleChange,
    isStepComplete,
    reset,
    setCurrentStep,
    touched,
    validateField,
    validateStep,
    values,
  };
}

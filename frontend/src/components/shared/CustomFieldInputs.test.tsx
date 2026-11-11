import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { toPayload, type CustomFieldDefinition, type CustomFieldValues } from '../../api/customFieldsApi';
import { CustomFieldInputs } from './CustomFieldInputs';

const definitions: CustomFieldDefinition[] = [
  { id: 1, entity: 'student', key: 'blood_group', label: 'Blood group', type: 'select', options: ['A+', 'O+'], helpText: null, isRequired: true, isActive: true, sortOrder: 0 },
  { id: 2, entity: 'student', key: 'family_income', label: 'Family income', type: 'number', options: [], helpText: 'Yearly, in rupees', isRequired: false, isActive: true, sortOrder: 1 },
  { id: 3, entity: 'student', key: 'languages', label: 'Languages', type: 'multiselect', options: ['English', 'Hindi', 'Tamil'], helpText: null, isRequired: false, isActive: true, sortOrder: 2 },
  { id: 4, entity: 'student', key: 'hostel', label: 'Hostel', type: 'boolean', options: [], helpText: null, isRequired: false, isActive: true, sortOrder: 3 },
];

function Harness({ onValues }: { onValues: (values: CustomFieldValues) => void }) {
  const [values, setValues] = useState<CustomFieldValues>({});
  return (
    <CustomFieldInputs
      definitions={definitions}
      values={values}
      onChange={(next) => { setValues(next); onValues(next); }}
      errors={{ 'customFields.blood_group': 'The Blood group field is required.' }}
    />
  );
}

describe('CustomFieldInputs', () => {
  it('renders each field type and produces an API payload', async () => {
    let latest: CustomFieldValues = {};
    render(<Harness onValues={(values) => { latest = values; }} />);
    const user = userEvent.setup();

    expect(screen.getByText('The Blood group field is required.')).toBeInTheDocument();
    expect(screen.getByText('Yearly, in rupees')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Blood group/), 'O+');
    await user.type(screen.getByLabelText('Family income'), '450000');
    await user.click(screen.getByLabelText('English'));
    await user.click(screen.getByLabelText('Tamil'));
    await user.click(screen.getByLabelText('Yes'));

    expect(toPayload(definitions, latest)).toEqual({
      blood_group: 'O+',
      family_income: 450000,
      languages: ['English', 'Tamil'],
      hostel: true,
    });

    // Clearing inputs sends null, which removes the stored value.
    await user.clear(screen.getByLabelText('Family income'));
    await user.click(screen.getByLabelText('English'));
    await user.click(screen.getByLabelText('Tamil'));
    expect(toPayload(definitions, latest)).toMatchObject({ family_income: null, languages: null });
  });

  it('renders nothing without definitions', () => {
    const { container } = render(<CustomFieldInputs definitions={[]} values={{}} onChange={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

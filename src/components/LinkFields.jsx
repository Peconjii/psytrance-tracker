import ImageField from './ImageField.jsx'

// The link fields of a page editor: one input per field ({ key, label, placeholder, type? }), or a picture field with
// upload when the field has image: 'square' | 'flyer'. idPrefix keeps the ids unique on the page.
function LinkFields({ fields, idPrefix, values, onChange }) {
    return fields.map(field => field.image ? (
        <ImageField key={field.key} id={`${idPrefix}-${field.key}`} label={field.label} kind={field.image} value={values[field.key]}
            placeholder={field.placeholder} onChange={(url) => onChange(field.key, url)} />
    ) : (
        <div key={field.key}>
            <label htmlFor={`${idPrefix}-${field.key}`} className="field-label">{field.label}</label>
            <input id={`${idPrefix}-${field.key}`} type={field.type || 'url'} className="field" value={values[field.key]}
                placeholder={field.placeholder} onChange={(e) => onChange(field.key, e.target.value)} />
        </div>
    ))
}

export default LinkFields

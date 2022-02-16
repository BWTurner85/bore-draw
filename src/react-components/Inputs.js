import React from "react";

export function NumericInput({ id, label, value, onChange }) {
    return (<span id={id} className='input numericInput'>
        <label>{label}:</label>
        <input
            type='number'
            value={value}
            onChange={e => { console.log(onChange); onChange(e.target.value) }}
        />
    </span>)
}

export function TextInput({ id, label, value, onChange }) {
    return (<span id={id} className='input textInput'>
        <label>{label}:</label>
        <input
            type='text'
            value={value}
            onChange={e => onChange(e.target.value) }
        />
    </span>)
}
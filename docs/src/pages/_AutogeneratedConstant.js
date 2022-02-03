import React from 'react';

export default function AutogeneratedConstant(props) {
  const {
    varname,
    constant,
  } = props;
  return (
    <table>
      <thead>
        <tr>
          <th>Key</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(constant).map(c => (
          <tr key={c}>
            <td><code>{varname}.{c}</code></td>
            <td>{constant[c]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

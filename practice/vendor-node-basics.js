
const vendor = {
    vendor_id: 101,
    vendor_name: 'Dream Wedding Photography',
    service_type: 'Photography',
    contract_total: 15000
};

const serviceTypes = [
    'Venue',
    'Catering',
    'Photography',
    'Decoration',
    'Music'
];

function describeVendor(item) {
    return `${item.vendor_id}: ${item.vendor_name} 
    [${item.service_type}] - ${item.contract_total} EGP`;
}

console.log(describeVendor(vendor));

console.log('Available service types:', serviceTypes);

console.log('JSON representation:');

console.log(JSON.stringify(vendor, null, 2));

const vendorService = require('../services/vendorService');

const getVendors = (req, res, next) => {
    try {
        const vendors = vendorService.getVendors(
            1,
            req.query.service_type
        );
        res.json(vendors);
    } catch (error) {
        next(error);
    }
};

const getVendorById = (req, res, next) => {
    try {
        res.json(
            vendorService.getVendorById(1, Number(req.params.id))
        );
    } catch (error) {
        next(error);
    }
};

const createVendor = (req, res, next) => {
    try {
        res.status(201).json(
            vendorService.createVendor(1, req.body)
        );
    } catch (error) {
        next(error);
    }
};

const updateVendor = (req, res, next) => {
    try {
        res.json(
            vendorService.updateVendor(
                1, Number(req.params.id), req.body
            )
        );
    } catch (error) {
        next(error);
    }
};

const deleteVendor = (req, res, next) => {
    try {
        vendorService.deleteVendor(1, Number(req.params.id));
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getVendors,
    getVendorById,
    createVendor,
    updateVendor,
    deleteVendor
};
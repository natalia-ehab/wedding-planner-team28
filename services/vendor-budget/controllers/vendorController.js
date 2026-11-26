const vendorService = require('../services/vendorService');

const getVendors = async (req, res, next) => {
    try {
        const vendors = await vendorService.getVendors(
            1,
            req.query.service_type
        );

        res.json(vendors);

    } catch (error) {
        next(error);
    }
};

const getVendorById = async (req, res, next) => {
    try {
        const vendor = await vendorService.getVendorById(
            1,
            Number(req.params.id)
        );

        res.json(vendor);

    } catch (error) {
        next(error);
    }
};

const createVendor = async (req, res, next) => {
    try {
        const vendor = await vendorService.createVendor(
            1,
            req.body
        );

        res.status(201).json(vendor);

    } catch (error) {
        next(error);
    }
};

const updateVendor = async (req, res, next) => {
    try {
        const vendor = await vendorService.updateVendor(
            1,
            Number(req.params.id),
            req.body
        );

        res.json(vendor);

    } catch (error) {
        next(error);
    }
};

const deleteVendor = async (req, res, next) => {
    try {
        await vendorService.deleteVendor(
            1,
            Number(req.params.id)
        );

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
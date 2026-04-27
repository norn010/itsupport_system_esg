import { Printer } from '../models/printerModels.js';

export const getPrinters = async (req, res, next) => {
  try {
    const printers = await Printer.findAll();
    res.json(printers);
  } catch (error) {
    next(error);
  }
};

export const getPrinterById = async (req, res, next) => {
  try {
    const printer = await Printer.findById(req.params.id);
    if (!printer) return res.status(404).json({ message: 'Printer not found' });
    res.json(printer);
  } catch (error) {
    next(error);
  }
};

export const createPrinter = async (req, res, next) => {
  try {
    const { brand, branch, product_name, serial_number, ip } = req.body;
    const newPrinter = await Printer.create({
      brand,
      branch,
      product_name,
      serial_number,
      ip
    });
    res.status(201).json(newPrinter);
  } catch (error) {
    next(error);
  }
};

export const updatePrinter = async (req, res, next) => {
  try {
    const { brand, branch, product_name, serial_number, ip } = req.body;
    const updatedPrinter = await Printer.update(req.params.id, {
      brand,
      branch,
      product_name,
      serial_number,
      ip
    });
    res.json(updatedPrinter);
  } catch (error) {
    next(error);
  }
};

export const deletePrinter = async (req, res, next) => {
  try {
    await Printer.delete(req.params.id);
    res.json({ message: 'Printer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

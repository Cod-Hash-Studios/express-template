const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const { HttpGet, HttpPost, HttpPut, HttpDelete, HttpPatch } = require('../config/decorateur');

class UserController {
    @HttpGet('/users')
    async getAllUsers(req, res) {
        try {
            const users = await prisma.appUser.findMany();
            res.json(users);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpGet('/users/{id}')
	@Authorize({ roles: ['Admin'] })
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await prisma.appUser.findUnique({
                where: { id }
            });
            user ? res.json(user) : res.status(404).send('User not found');
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpPost('/users')
    async createUser(req, res) {
        try {
            const { email, password, firstName, lastName, roleIds } = req.body;
            // Valider les données ici
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await prisma.appUser.create({
                data: { email, password: hashedPassword, firstName, lastName, roleIds }
            });
            res.status(201).json(newUser);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpPut('/users/{id}')
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { email, password, firstName, lastName, roleIds } = req.body;
            // Valider les données ici
            const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
            const updatedUser = await prisma.appUser.update({
                where: { id },
                data: { email, password: hashedPassword, firstName, lastName, roleIds }
            });
            res.json(updatedUser);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpDelete('/users/{id}')
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            await prisma.appUser.delete({
                where: { id }
            });
            res.status(204).send();
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

	@HttpPatch('/users/{id}')
    async updateUserPartial(req, res) {
        const { id } = req.params;
        const updateData = req.body;

        try {
            const updatedUser = await prisma.appUser.update({
                where: { id },
                data: updateData
            });
            res.json(updatedUser);
        } catch (error) {
            res.status(500).send('Error updating user');
        }
    }
}

module.exports = UserController;

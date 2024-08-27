#!/usr/bin/env python3
from functools import partial
from numba.core.ir_utils import visit_vars
import numpy as np
import matplotlib.pyplot as plt
from numba import jit
from matplotlib import animation


@jit(nopython=True, cache=True)
def velocity(eta, dx, U, V, g, dt):
    U[:, 1:-1] -= g * dt * (eta[:, 1:] - eta[:, :-1]) / dx
    V[1:-1, :] -= g * dt * (eta[1:, :] - eta[:-1, :]) / dx


@jit(nopython=True, cache=True)
def cell_upwind_flux(eta, F, U, V, dt):
    """Upwind flux sum"""
    F[:] = 0
    flux = 0.0
    for i in range(eta.shape[0]):
        for j in range(eta.shape[1] - 1):
            if U[i, j + 1] < 0:
                flux = dt * eta[i, j + 1] * U[i, j + 1]
            else:
                flux = dt * eta[i, j] * U[i, j + 1]
            F[i, j] -= flux
            F[i, j + 1] += flux

    for i in range(eta.shape[0] - 1):
        for j in range(eta.shape[1]):
            if V[i + 1, j] < 0:
                flux = dt * eta[i + 1, j] * V[i + 1, j]
            else:
                flux = dt * eta[i, j] * V[i + 1, j]
            F[i, j] -= flux
            F[i + 1, j] += flux


nx = 128
ny = 64
Lx = 100
H = 1.0

dx = Lx / nx
Ly = ny * dx

xe = np.arange(nx + 1) * dx
ye = np.arange(ny + 1) * dx

xc = (0.5 + np.arange(nx)) * dx
yc = (0.5 + np.arange(ny)) * dx

Xe, Ye = np.meshgrid(xe, ye)
Xc, Yc = np.meshgrid(xc, yc)


# edges of the cells
U = np.zeros((ny, nx + 1), np.float64)
V = np.zeros((ny + 1, nx), np.float64)
dU = np.zeros((ny, nx + 1), np.float64)
dV = np.zeros((ny + 1, nx), np.float64)

R = (Xc - Lx / 2) ** 2 + (Yc - Ly / 2) ** 2
eta = np.exp(-R / 16.0)
R = (Xc - Lx / 3) ** 2 + (Yc - Ly / 3) ** 2
eta += np.exp(-R / 16.0)

R = (Xc - Lx / 4) ** 2 + (Yc - Ly / 3) ** 2
eta += 2 * np.exp(-R / 16.0)
eta_tmp = eta.copy()


k1 = np.zeros_like(eta)
k2 = np.zeros_like(eta)
k3 = np.zeros_like(eta)

dt = 0.15

fig, ax = plt.subplots(1, 1, figsize=(8, 7))
ax.set_aspect("equal")
img = ax.pcolormesh(Xe, Ye, eta)


def animate(i, eta, U, V):
    """Animation funcion"""
    img.set_array(eta)
    velocity(eta, dx, U, V, 10, dt)
    cell_upwind_flux(eta, k1, U, V, dt)
    eta += k1
    return (img,)


def animate_leapfrog(i, eta, U, V):
    """Animation funcion"""
    img.set_array(eta)
    if i == 0:
        velocity(eta, dx, U, V, 10, dt / 2.0)
        cell_upwind_flux(eta, k1, U, V, dt / 2.0)
        U[:] = 0
        V[:] = 0
        eta += k1

    velocity(eta, dx, U, V, 10, dt)
    cell_upwind_flux(eta, k1, U, V, dt)
    eta += k1

    if i % 20 == 10:
        R = (Xc - Lx / 4) ** 2 + (Yc - Ly / 3) ** 2
        eta += np.exp(-R / 16.0)
    return (img,)


def animate_rk3(i, eta, eta_tmp, U, V):
    """Animation funcion"""
    eta_tmp[:] = eta[:]
    img.set_array(eta_tmp)

    velocity(eta_tmp, dx, U, V, 10, dt)
    cell_upwind_flux(eta, k1, U, V, dt)

    eta_tmp = eta + k1 / 2
    velocity(eta_tmp, dx, U, V, 10, dt)
    cell_upwind_flux(eta_tmp, k2, U, V, dt)

    eta_tmp = eta + 2 * k2 - k1
    velocity(eta_tmp, dx, U, V, 10, dt)
    cell_upwind_flux(eta_tmp, k3, U, V, dt)

    eta += (k1 + 4.0 * k2 + k3) / 6.0

    if i % 20 == 10:
        R = (Xc - Lx / 4) ** 2 + (Yc - Ly / 3) ** 2
        eta += np.exp(-R / 16.0)

    return (img,)


ani = animation.FuncAnimation(
    fig,
    # func=partial(animate_rk3, eta=eta, eta_tmp=eta_tmp),
    func=partial(animate_leapfrog, eta=eta, U=U, V=V),
    frames=520,
    interval=50,
    blit=False,
    repeat=False,
)
plt.show()

#!/usr/bin/env python3
from numba.core.ir_utils import visit_vars
import numpy as np
import matplotlib.pyplot as plt
from numba import jit
from matplotlib import animation


@jit(nopython=True, cache=True)
def advec(U, V, Rho, Rho_tmp, dt):
    """Upwind integration of the continuity equation"""
    Rho_tmp[:] = Rho[:]
    flux = 0.0
    for i in range(Rho.shape[0]):
        for j in range(Rho.shape[1] - 1):
            if U[i, j + 1] < 0:
                flux = dt * Rho_tmp[i, j + 1] * U[i, j + 1]
            else:
                flux = dt * Rho_tmp[i, j] * U[i, j + 1]
            Rho[i, j] -= flux
            Rho[i, j + 1] += flux

    for i in range(Rho.shape[0] - 1):
        for j in range(Rho.shape[1]):
            if V[i + 1, j] < 0:
                flux = dt * Rho_tmp[i + 1, j] * V[i + 1, j]
            else:
                flux = dt * Rho_tmp[i, j] * V[i + 1, j]
            Rho[i, j] -= flux
            Rho[i + 1, j] += flux


@jit(nopython=True, cache=True)
def advec_vortices(vortices, dt):
    """Integrate the biot&Savart law on all the vortices."""
    OM = np.zeros(2, dtype=np.float64)
    xy = np.zeros(2, dtype=np.float64)
    u = np.zeros(2, dtype=np.float64)
    dist = 0.0
    for vort0 in vortices:
        xy[0] = vort0[0]
        xy[1] = vort0[1]
        u[:] = 0.0
        for vort1 in vortices:
            OM[0] = xy[0] - vort1[0]
            OM[1] = xy[1] - vort1[1]
            dist = np.linalg.norm(OM) + 2 * dx
            u[0] -= vort1[2] * OM[1] / dist**3
            u[1] += vort1[2] * OM[0] / dist**3
        vort0[:2] += dt * u


@jit(nopython=True, cache=True)
def get_UV(U, V, dx, vortices):
    """Integrate the biot&Savart law on all the vortices."""
    OM = np.zeros(2, dtype=np.float64)
    xy = np.zeros(2, dtype=np.float64)
    dist = 0.0
    for i in range(U.shape[0]):
        for j in range(U.shape[1]):
            xy[0] = j * dx
            xy[1] = (0.5 + i) * dx
            u_tmp = 0.0
            for vort in vortices:
                OM[0] = xy[0] - vort[0]
                OM[1] = xy[1] - vort[1]
                dist = np.linalg.norm(OM) + 2 * dx
                u_tmp -= vort[2] * OM[1] / dist**3
            U[i, j] = u_tmp

    for i in range(V.shape[0]):
        for j in range(V.shape[1]):
            xy[0] = (0.5 + j) * dx
            xy[1] = i * dx
            v_tmp = 0.0
            for vort in vortices:
                OM[0] = xy[0] - vort[0]
                OM[1] = xy[1] - vort[1]
                dist = np.linalg.norm(OM) + 2 * dx
                v_tmp += vort[2] * OM[0] / dist**3
            V[i, j] = v_tmp


def discard_vortices(vortex):
    for vort in vortex:
        if vort[0] < 0 or vort[0] > Lx or vort[1] > Ly or vort[1] < 0:
            vort[0] = 0
            vort[1] = 0
            vort[2] = 0.0


def vortices_aura(vortices, rho, X, Y, sigm):
    for vort in vortices:
        r = (X - vort[0]) ** 2 + (Y - vort[1]) ** 2
        rho += 0.1 * abs(vort[2]) * np.exp(-r / sigm)


def sides2center(Us, Vs, Uc, Vc):
    Uc[:] = (Us[:, 1:] + Us[:, :-1]) / 2
    Vc[:] = (Vs[1:, :] + Vs[:-1, :]) / 2


nx = 128
ny = 64
Lx = 2

dx = Lx / nx
Ly = ny * dx

xe = np.arange(nx + 1) * dx
ye = np.arange(ny + 1) * dx

xc = (0.5 + np.arange(nx)) * dx
yc = (0.5 + np.arange(ny)) * dx

Xe, Ye = np.meshgrid(xe, ye)
Xc, Yc = np.meshgrid(xc, yc)

vortices = np.random.uniform(0.0, 1.0, (80, 3))
vortices[:, 0] *= Lx
vortices[:, 1] *= Ly
vortices[:, 2] -= 0.5
vortices[:, 2] *= 4

Us = np.zeros((ny, nx + 1), np.float64)
Vs = np.zeros((ny + 1, nx), np.float64)


dt = 0.0005
sigm = 0.002
rho = np.zeros((ny, nx), dtype=np.float64)
vortices_aura(vortices, rho, Xc, Yc, sigm)
rho_tmp = rho.copy()

fig, ax = plt.subplots(1, 1, figsize=(8, 7))
img = ax.pcolormesh(Xe, Ye, rho)
# cross = ax.plot(vortices[:, 0], vortices[:, 1], "rX")


def animate(i):
    """Animation funcion"""
    get_UV(Us, Vs, dx, vortices)
    vortices_aura(vortices, rho, Xc, Yc, sigm)
    img = ax.pcolormesh(Xe, Ye, rho)
    # cross = ax.plot(vortices[:, 0], vortices[:, 1], "rX")
    advec_vortices(vortices, dt)
    discard_vortices(vortices)
    advec(Us, Vs, rho, rho_tmp, dt)
    return (img,)


ani = animation.FuncAnimation(
    fig,
    animate,
    frames=120,
    interval=50,
    blit=False,
    repeat=False,
)
plt.show()


# for vort in vortices:
#     if vort[0] > 0 and vort[0] < Lx and vort[1] < Ly and vort[0] > 0:
#         plt.plot(vort[0], vort[1], "rX")
# plt.show()

#!/usr/bin/env python3
import numpy as np
import matplotlib.pyplot as plt

plt.rcParams.update(
    {
        "text.usetex": True,
        "font.family": "serif",
    }
)
plt.rcParams["axes.edgecolor"] = "#f5f9db"
plt.rcParams["axes.labelcolor"] = "#f5f9db"
plt.rcParams["xtick.color"] = "#f5f9db"
plt.rcParams["ytick.color"] = "#f5f9db"
plt.rcParams["text.color"] = "#f5f9db"
# plt.rcParams["figure.facecolor"] = "#00000066"


n = 256
x = np.linspace(0, 1, n)
X, Y = np.meshgrid(x, x)
q1, q2 = X.copy(), Y.copy()

q1 = q1 + 0.2 + 0.2 * X * np.cos(np.pi * Y**2)
q2 = Y + 0.1 + 0.2 * 1 / (0.4 + X) * Y

grad_q1x = (q1[:, 1:] - q1[:, :-1]) * n
grad_q1y = (q1[1:, :] - q1[:-1, :]) * n

grad_q2x = (q2[:, 1:] - q2[:, :-1]) * n
grad_q2y = (q2[1:, :] - q2[:-1, :]) * n

levels = (np.arange(60) - 30) * 0.1
# fig, ax = plt.subplots(1, 2, sharey=True)
# ax[0].pcolormesh(X, Y, q1)
# ax[0].contour(X, Y, q1, levels=10, colors="k")
# ax[1].pcolormesh(X, Y, q2)
# ax[1].contour(X, Y, q2, levels=10, colors="k")

# ax[0].set_title("$q^1$")
# ax[1].set_title("$q^2$")
# ax[0].set_xlabel("$x$")
# ax[1].set_xlabel("$x$")

# ax[0].set_ylabel("$y$")
# # ax[1].set_ylabel("$y$")

# ax[0].set_aspect("equal")
# ax[1].set_aspect("equal")

# fig.savefig("q1q2.png", bbox_inches="tight", transparent=True)


# fig, ax = plt.subplots(1)
# ax.contour(X, Y, q1, levels=levels, colors="k")
# ax.contour(X, Y, q2, levels=levels, colors="w")
# ax.quiver(
#     0.345, 0.475, 0.4, 0.2, angles="xy", color="k", scale=1, zorder=10, width=0.02
# )
# ax.text(0.5, 0.6, "$v$", size=28, color="k")

# ax.set_title("$q^1$ and $q^2$ gridlines")
# ax.set_xlabel("$x$")
# ax.set_ylabel("$y$")

# ax.set_aspect("equal")
# fig.savefig("q1q2grid.png", bbox_inches="tight", transparent=True)
# plt.close()

x0 = 0.345
y0 = 0.475
fig, ax = plt.subplots(1, 2, figsize=(8, 16))
ax[0].contour(X, Y, q1, levels=levels, colors="#636363")
ax[0].contour(X, Y, q2, levels=levels, colors="#636363")
ax[0].quiver(x0, y0, 0.4, 0.2, angles="xy", color="k", scale=1, zorder=10, width=0.02)

ax[1].contour(X, Y, 0.5 * q1, levels=levels, colors="#636363")
ax[1].contour(X, Y, q2, levels=levels, colors="#636363")
ax[1].quiver(x0, y0, 0.4, 0.2, angles="xy", color="k", scale=1, zorder=10, width=0.02)

T_q1 = [-grad_q1y[int(y0 * n), int(x0 * n)], grad_q1x[int(y0 * n), int(x0 * n)]]
T_q2 = [grad_q2y[int(y0 * n), int(x0 * n)], -grad_q2x[int(y0 * n), int(x0 * n)]]

ax[0].quiver(
    x0,
    y0,
    T_q1[0],
    T_q1[1],
    angles="xy",
    color="#57effa",
    scale=5,
    zorder=10,
    width=0.008,
)

ax[0].quiver(
    x0,
    y0,
    T_q2[0],
    T_q2[1],
    angles="xy",
    color="#ff5e5e",
    scale=5,
    zorder=10,
    width=0.008,
)

ax[1].quiver(
    x0,
    y0,
    T_q1[0],
    T_q1[1],
    angles="xy",
    color="#57effa",
    scale=5,
    zorder=10,
    width=0.008,
)

ax[1].quiver(
    x0,
    y0,
    2 * T_q2[0],
    2 * T_q2[1],
    angles="xy",
    color="#ff5e5e",
    scale=5,
    zorder=10,
    width=0.008,
)
ax[0].text(0.5, 0.35, "$e_1$", size=24, color="#ff5e5e")
ax[0].text(0.22, 0.5, "$e_2$", size=24, color="#57effa")
ax[1].text(0.5, 0.35, "$e_1$", size=24, color="#ff5e5e")
ax[1].text(0.22, 0.5, "$e_2$", size=24, color="#57effa")


ax[0].set_title(r"Original coordinates")
ax[0].set_xlabel("$x$")
ax[0].set_ylabel("$y$")
ax[1].set_title(r"Transformed coordinates")
ax[1].set_xlabel("$x$")
ax[1].set_ylabel("$y$")

ax[0].set_aspect("equal")
ax[1].set_aspect("equal")
fig.savefig("q1q2transformedcontra.png", bbox_inches="tight", transparent=True)
plt.show()
plt.close()

fig, ax = plt.subplots(1, 2, figsize=(8, 16))
ax[0].contour(X, Y, q1, levels=levels, colors="#636363")
ax[0].contour(X, Y, q2, levels=levels, colors="#636363")
ax[0].quiver(x0, y0, 0.4, 0.2, angles="xy", color="k", scale=1, zorder=10, width=0.02)

ax[1].contour(X, Y, 0.5 * q1, levels=levels, colors="#636363")
ax[1].contour(X, Y, q2, levels=levels, colors="#636363")
ax[1].quiver(x0, y0, 0.4, 0.2, angles="xy", color="k", scale=1, zorder=10, width=0.02)

g_q1 = [grad_q1x[int(y0 * n), int(x0 * n)], grad_q1y[int(y0 * n), int(x0 * n)]]
g_q2 = [grad_q2x[int(y0 * n), int(x0 * n)], grad_q2y[int(y0 * n), int(x0 * n)]]

ax[0].quiver(
    x0,
    y0,
    g_q1[0],
    g_q1[1],
    angles="xy",
    color="#ff5e5e",
    scale=5,
    zorder=10,
    width=0.008,
)

ax[0].quiver(
    x0,
    y0,
    g_q2[0],
    g_q2[1],
    angles="xy",
    color="#57effa",
    scale=5,
    zorder=10,
    width=0.008,
)

ax[1].quiver(
    x0,
    y0,
    0.5 * g_q1[0],
    0.5 * g_q1[1],
    angles="xy",
    color="#ff5e5e",
    scale=5,
    zorder=10,
    width=0.008,
)

ax[1].quiver(
    x0,
    y0,
    g_q2[0],
    g_q2[1],
    angles="xy",
    color="#57effa",
    scale=5,
    zorder=10,
    width=0.008,
)
ax[0].text(0.5, 0.33, "$e^1$", size=24, color="#ff5e5e")
ax[0].text(0.22, 0.5, "$e^2$", size=24, color="#57effa")
ax[1].text(0.5, 0.33, "$e^1$", size=24, color="#ff5e5e")
ax[1].text(0.22, 0.5, "$e^2$", size=24, color="#57effa")


ax[0].set_title(r"Original coordinates")
ax[0].set_xlabel("$x$")
ax[0].set_ylabel("$y$")
ax[1].set_title(r"Transformed coordinates")
ax[1].set_xlabel("$x$")
ax[1].set_ylabel("$y$")

ax[0].set_aspect("equal")
ax[1].set_aspect("equal")
fig.savefig("q1q2transformedcova.png", bbox_inches="tight", transparent=True)
plt.show()
plt.close()

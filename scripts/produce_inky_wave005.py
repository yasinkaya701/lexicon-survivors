#!/usr/bin/env python3
"""Create five DISTINCT Inky wave-5 story-art DRAFTS. Requires Pillow.

These are deliberately unapproved artist drafts, never runtime-approved work.
Generated WebP mirrors are byte-identical; lossless PNG masters stay outside
the runtime asset paths. A human artist may revise/reject every panel.
"""
from __future__ import annotations
from PIL import Image, ImageDraw
from pathlib import Path
import hashlib, random, json

W, H = 640, 360
ROOT = Path(__file__).resolve().parents[1]
NAVY=(10,15,29); DARK=(17,20,35); SHADE=(26,31,46)
GOLD=(222,164,86); WARM=(255,206,118); CREAM=(231,215,180)
COBALT=(27,62,126); CYAN=(85,163,180)

class Painter:
    def __init__(self, seed):
        self.img=Image.new('RGB',(W,H),NAVY)
        self.d=ImageDraw.Draw(self.img)
        self.r=random.Random(seed)
    def rect(self,box,col,outline=None,width=1):
        self.d.rectangle(tuple(map(int,box)),fill=col,outline=outline,width=width)
    def line(self,points,fill,width=1):
        self.d.line([(int(x),int(y)) for x,y in points],fill=fill,width=width)
    def poly(self,pts,fill,outline=None,width=1):
        ps=[(int(x),int(y)) for x,y in pts]
        self.d.polygon(ps,fill=fill)
        if outline: self.line(ps+[ps[0]],outline,width)
    def circle(self,box,fill,outline=None):
        self.d.ellipse(tuple(map(int,box)),fill=fill,outline=outline)
    def light(self,x,y,r,col=(119,107,79)):
        for rr,mix in [(r,.13),(r*.75,.20),(r*.48,.30)]:
            c=tuple(int(NAVY[i]*(1-mix)+col[i]*mix) for i in range(3))
            self.d.polygon([(x-rr,y),(x,y-rr//2),(x+rr,y),(x,y+rr//2)],fill=c)
    def specks(self,n,box,cols=((72,79,94),(108,98,92))):
        x0,y0,x1,y1=box
        for _ in range(n):
            x=self.r.randint(x0,x1);y=self.r.randint(y0,y1)
            self.rect((x,y,x+self.r.choice([1,1,2]),y+self.r.choice([1,2])),self.r.choice(cols))

def bookshelf(p,x,y,ww,hh):
    p.rect((x-5,y-7,x+ww+5,y+hh+7),(16,19,29),outline=(8,10,18),width=3)
    p.rect((x,y,x+ww,y+hh),(41,30,39),outline=(115,78,67),width=3)
    p.rect((x+4,y+5,x+ww-4,y+hh-3),(28,27,41))
    for level in range(4):
        yy=y+8+level*(hh-16)//4
        p.rect((x+1,yy+20,x+ww-1,yy+24),(84,56,49),outline=(129,82,62))
        xx=x+8
        while xx<x+ww-9:
            bw=p.r.randint(5,12);hei=p.r.randint(11,20)
            col=p.r.choice([(61,83,95),(83,56,78),(115,71,56),(56,94,91),(112,93,64),(66,59,75)])
            p.rect((xx,yy+20-hei,xx+bw-1,yy+19),col)
            p.rect((xx,yy+20-hei,xx+1,yy+19),tuple(min(c+30,255) for c in col))
            if bw>7: p.rect((xx+3,yy+20-hei+3,xx+4,yy+20-hei+5),(147,119,88))
            xx+=bw+p.r.randint(1,3)
    p.rect((x-6,y-9,x+ww+7,y-2),(96,65,52))
    p.rect((x-6,y+hh,x+ww+7,y+hh+6),(87,58,48))
    for yy in (y+2,y+hh-7):
        p.rect((x-2,yy,x+1,yy+3),GOLD)
        p.rect((x+ww-1,yy,x+ww+2,yy+3),GOLD)

def arch(p,x,y,w,h,lit=False):
    p.poly([(x-8,y+h),(x-8,y+h//3),(x,y+h//6),(x+w//2,y-22),(x+w,y+h//6),(x+w+8,y+h//3),(x+w+8,y+h)],(48,44,52),outline=(97,71,63),width=3)
    p.poly([(x+7,y+h),(x+7,y+h//3),(x+w//2,y+8),(x+w-7,y+h//3),(x+w-7,y+h)],(17,22,36) if not lit else (52,73,79))
    p.line([(x+w//2,y+10),(x+w//2,y+h)],(70,61,70),2)
    if lit:
        p.poly([(x+12,y+h),(x+w//2,y+45),(x+w-12,y+h)],(49,88,102))
        p.poly([(x+22,y+h),(x+w//2,y+75),(x+w-22,y+h)],(91,131,128))

def basic_library(p,variant):
    p.rect((0,0,639,359),NAVY)
    p.poly([(0,0),(640,0),(640,195),(0,208)],(24,27,43))
    for i in range(13):
        xx=i*52+((variant*13)%21)
        p.line([(xx,0),(xx+28,180)],(34,38,56),3)
    for x in [20,255,385,614]:
        p.rect((x-11,0,x+11,229),(56,47,58),outline=(96,68,63),width=3)
        p.rect((x-8,2,x-4,226),(127,87,65))
        for y in range(24,200,42): p.rect((x-13,y,x+13,y+4),(111,75,61))
    arch(p,269,68,102,173,lit=True)
    for x in (-16,400): bookshelf(p,x,74,246,192)
    p.poly([(0,242),(640,239),(640,360),(0,360)],(43,43,53))
    for i in range(9):
        x=i*100-70
        p.line([(x,360),(320+(x-320)*.10,240)],(77,64,65),2)
    for yy in [257,273,297,326,359]:p.line([(0,yy),(640,yy-2)],(76,62,62),2)
    for i in range(110):
        x=p.r.randrange(0,640);y=p.r.randrange(54,308)
        if (70<x<242) or (400<x<585):continue
        length=p.r.choice([4,6,10])
        p.line([(x,y),(x+1,y-length)],(65,111,128))
        if i%9==0:p.rect((x,y-length-3,x+2,y-length-2),(111,169,170))
    p.poly([(282,221),(362,221),(505,360),(170,360)],(46,65,75))
    p.poly([(303,227),(351,227),(432,359),(243,359)],(53,73,80))
    for i in range(30):
        x=p.r.randrange(15,625);y=p.r.randrange(260,358)
        p.line([(x,y),(x+p.r.randint(2,18),y)],p.r.choice([(81,97,106),(106,91,89),(68,89,105)]))
    for x in [75,220,424,563]:
        p.line([(x,73),(x,106)],(109,83,64),3)
        p.poly([(x-9,102),(x+9,102),(x+5,118),(x-5,118)],(176,126,67),outline=(71,50,44),width=2)
        p.rect((x-3,106,x+3,112),(255,209,125))
        p.rect((x-12,120,x+13,121),(95,77,71))
    for i in range(50):
        x=p.r.randrange(W);y=p.r.randrange(240,H)
        p.rect((x,y,x+3,y+1),(61,56,63))

def receipt(p,x,y,s=1):
    w=int(38*s);h=int(15*s)
    pts=[(x-w//2,y-h//2),(x+w//2-4,y-h//2-2),(x+w//2,y+h//2-1),(x+w//2-4,y+h//2),(x-w//2,y+h//2-1)]
    p.poly(pts,(206,188,148),outline=(116,95,77),width=2)
    p.line([(x-w//3,y+h//4),(x+w//4,y+h//4)],(174,151,116))
    p.poly([(x+7*s,y-3*s),(x+8*s,y),(x+11*s,y+1*s),(x+8*s,y+2*s),(x+7*s,y+5*s),(x+6*s,y+2*s),(x+3*s,y+1*s),(x+6*s,y)],(154,117,72))

def inky(p,x,y,s=1,pose='stand',back=False):
    sc=lambda n:int(n*s)
    p.circle((x-sc(24),y-sc(2),x+sc(23),y+sc(5)),(18,22,34))
    p.rect((x-sc(15),y-sc(12),x-sc(2),y),(30,32,44),outline=(12,15,25),width=2)
    p.rect((x+sc(2),y-sc(12),x+sc(16),y),(30,32,44),outline=(12,15,25),width=2)
    p.rect((x-sc(18),y-sc(6),x-sc(1),y-sc(3)),(111,78,63))
    p.rect((x+sc(1),y-sc(6),x+sc(21),y-sc(3)),(111,78,63))
    p.poly([(x-sc(12),y-sc(61)),(x+sc(13),y-sc(61)),(x+sc(27),y-sc(11)),(x-sc(25),y-sc(12))],(24,57,117),outline=(13,28,72),width=2)
    p.poly([(x-sc(17),y-sc(53)),(x-sc(25),y-sc(16)),(x-sc(18),y-sc(16)),(x-sc(6),y-sc(48))],(45,91,158))
    p.poly([(x+sc(10),y-sc(50)),(x+sc(22),y-sc(16)),(x+sc(9),y-sc(17))],(20,40,90))
    p.rect((x-sc(17),y-sc(26),x+sc(15),y-sc(22)),(192,143,76))
    p.rect((x-sc(2),y-sc(27),x+sc(5),y-sc(19)),(243,192,91))
    if pose=='reach':
        p.poly([(x+sc(10),y-sc(51)),(x+sc(30),y-sc(40)),(x+sc(42),y-sc(53)),(x+sc(35),y-sc(58)),(x+sc(19),y-sc(62))],(48,89,146),outline=(19,43,91),width=2)
        p.rect((x+sc(35),y-sc(58),x+sc(45),y-sc(49)),(212,168,133))
        p.line([(x+sc(44),y-sc(53)),(x+sc(64),y-sc(38))],(181,180,161),2)
        p.line([(x+sc(45),y-sc(51)),(x+sc(64),y-sc(39))],(125,132,134))
    else:
        p.poly([(x-sc(17),y-sc(54)),(x-sc(27),y-sc(28)),(x-sc(21),y-sc(25)),(x-sc(9),y-sc(45))],(41,75,132),outline=(22,39,79),width=2)
        p.rect((x-sc(27),y-sc(30),x-sc(20),y-sc(21)),(209,162,129))
        p.poly([(x+sc(14),y-sc(53)),(x+sc(24),y-sc(26)),(x+sc(18),y-sc(23)),(x+sc(6),y-sc(43))],(42,78,132),outline=(18,35,76),width=2)
        p.rect((x+sc(17),y-sc(28),x+sc(24),y-sc(18)),(202,153,115))
    p.rect((x-sc(13),y-sc(83),x+sc(12),y-sc(58)),(196,150,118),outline=(76,51,61),width=2)
    p.rect((x-sc(14),y-sc(85),x+sc(13),y-sc(79)),(39,39,55))
    if not back:
        p.rect((x-sc(8),y-sc(73),x-sc(5),y-sc(70)),(21,27,43))
        p.rect((x+sc(5),y-sc(73),x+sc(8),y-sc(70)),(21,27,43))
        p.rect((x-sc(2),y-sc(64),x+sc(5),y-sc(63)),(139,88,77))
    p.poly([(x-sc(24),y-sc(86)),(x+sc(24),y-sc(86)),(x+sc(7),y-sc(121)),(x-sc(4),y-sc(112))],(29,66,143),outline=(12,34,80),width=2)
    p.poly([(x-sc(7),y-sc(114)),(x+sc(5),y-sc(115)),(x+sc(11),y-sc(88)),(x-sc(18),y-sc(88))],(60,107,178))
    p.rect((x-sc(26),y-sc(91),x+sc(24),y-sc(85)),(221,167,79),outline=(110,73,52),width=2)
    p.poly([(x+sc(9),y-sc(110)),(x+sc(11),y-sc(126)),(x+sc(17),y-sc(130)),(x+sc(13),y-sc(111))],(242,203,114))
    p.rect((x+sc(11),y-sc(113),x+sc(13),y-sc(101)),(166,120,64))
    p.rect((x-sc(12),y-sc(52),x-sc(9),y-sc(48)),(150,128,86))
    p.rect((x+sc(4),y-sc(35),x+sc(6),y-sc(33)),(167,135,81))

def neris(p,x,y,s=1,gesture=False):
    q=lambda v:int(v*s)
    p.circle((x-q(20),y-3,x+q(20),y+4),(17,22,30))
    p.poly([(x-q(22),y-q(67)),(x+q(20),y-q(67)),(x+q(27),y-q(12)),(x-q(28),y-q(10))],(42,76,59),outline=(19,37,37),width=3)
    p.poly([(x-q(10),y-q(64)),(x+q(11),y-q(63)),(x+q(6),y-q(39)),(x-q(6),y-q(39))],(223,209,173))
    p.poly([(x-q(19),y-q(63)),(x-q(4),y-q(42)),(x-q(24),y-q(18))],(65,111,85))
    p.poly([(x+q(19),y-q(63)),(x+q(7),y-q(42)),(x+q(23),y-q(18))],(29,66,55))
    p.circle((x-q(19),y-q(117),x+q(18),y-q(69)),(184,125,101),outline=(58,43,49))
    p.poly([(x-q(20),y-q(102)),(x-q(12),y-q(132)),(x+q(11),y-q(129)),(x+q(21),y-q(99)),(x+q(14),y-q(113)),(x+q(6),y-q(112)),(x-q(1),y-q(120)),(x-q(12),y-q(108))],(37,35,49))
    p.poly([(x-q(5),y-q(127)),(x+q(1),y-q(133)),(x+q(7),y-q(108)),(x+q(4),y-q(97))],(191,191,184))
    p.rect((x-q(10),y-q(95),x-q(7),y-q(91)),(57,88,64))
    p.rect((x+q(5),y-q(95),x+q(8),y-q(91)),(57,88,64))
    p.line([(x+q(2),y-q(87)),(x+q(10),y-q(86))],(124,75,72),2)
    p.rect((x-q(5),y-q(39),x+q(2),y-q(34)),GOLD)
    p.rect((x-q(2),y-q(35),x,y-q(26)),(221,185,111))
    p.line([(x+q(13),y-q(63)),(x+q(21),y-q(22))],(93,67,52),2)
    if gesture:
        p.poly([(x-q(17),y-q(63)),(x-q(46),y-q(48)),(x-q(58),y-q(51)),(x-q(60),y-q(60)),(x-q(43),y-q(64)),(x-q(18),y-q(77))],(60,101,77),outline=(25,47,45),width=2)
        p.rect((x-q(64),y-q(61),x-q(58),y-q(52)),(190,142,113))

def blank_page(p,x,y,s=1):
    q=lambda v:int(v*s)
    p.poly([(x-q(14),y-q(111)),(x+q(13),y-q(113)),(x+q(25),y-q(75)),(x+q(20),y-q(40)),(x+q(31),y-q(4)),(x-q(30),y-q(3)),(x-q(22),y-q(45)),(x-q(25),y-q(79))],(189,183,163),outline=(90,88,84),width=3)
    p.poly([(x-q(17),y-q(84)),(x-q(9),y-q(115)),(x+q(12),y-q(115)),(x+q(15),y-q(86)),(x+q(7),y-q(74)),(x-q(7),y-q(72))],(217,212,191))
    p.poly([(x-q(8),y-q(57)),(x-q(22),y-q(15)),(x-q(7),y-q(23))],(157,156,147))
    p.poly([(x+q(9),y-q(58)),(x+q(25),y-q(14)),(x+q(8),y-q(23))],(143,147,145))
    p.poly([(x-q(8),y-q(102)),(x+q(9),y-q(102)),(x+q(8),y-q(79)),(x-q(8),y-q(78))],(56,64,67))

def rainy_threshold(p):
    p.poly([(300,103),(347,101),(362,229),(288,229)],(50,78,89))
    for i in range(32):
        xx=p.r.randint(277,363);yy=p.r.randint(105,233)
        p.line([(xx,yy),(xx-1,yy-p.r.randint(4,12))],(103,151,170))

def pixeldust(p,count=60):
    for _ in range(count):
        x=p.r.randint(0,639);y=p.r.randint(36,339)
        p.rect((x,y,x+1,y+1),p.r.choice([(83,92,95),(104,94,81),(114,117,116)]))

def scene_1():
    p=Painter(4101);basic_library(p,1);rainy_threshold(p)
    # Defeated Inquisitor remnant: no second encounter
    p.poly([(157,194),(179,167),(199,188),(211,244),(146,247)],(66,32,42),outline=(103,48,51),width=3)
    p.poly([(157,190),(175,174),(195,193),(182,218)],(86,45,47))
    p.line([(188,222),(230,271)],(155,74,72),5)
    p.poly([(232,267),(242,266),(235,276),(227,273)],(191,89,82))
    inky(p,413,292,.92)
    p.light(328,285,63,(181,151,96))
    receipt(p,317,289,1.30)
    for i in range(17):
        x=300+i*3;y=286-(i%3)*2
        p.line([(x,y),(x+5,y-19-i%4)],(124,160,171))
    pixeldust(p,36)
    return p.img

def scene_2():
    p=Painter(4102);basic_library(p,2)
    p.poly([(0,267),(640,241),(640,360),(0,360)],(39,46,60))
    for y in [279,320,355]:p.line([(0,y+11),(640,y-5)],(76,66,70),3)
    p.light(362,237,93,(164,158,113))
    inky(p,239,325,1.55,pose='reach')
    receipt(p,350,230,2.08)
    for i in range(15):
        x=330+p.r.randint(-10,48);y=228+p.r.randint(-5,10)
        p.line([(x,y),(x+2,y-p.r.randint(18,38))],(103,156,170))
    p.line([(335,235),(375,244)],(151,161,154),2)
    p.line([(337,237),(375,246)],(94,126,134))
    for i in range(27):
        xx=p.r.randint(290,540);yy=p.r.randint(285,354)
        p.line([(xx,yy),(xx+p.r.randint(5,24),yy-2)],(81,107,115))
    pixeldust(p,20)
    return p.img

def scene_3():
    p=Painter(4103);basic_library(p,3)
    p.poly([(62,245),(465,231),(591,355),(0,354)],(78,57,48),outline=(136,94,66),width=4)
    p.poly([(85,248),(460,237),(530,326),(26,335)],(106,73,57),outline=(38,35,43),width=3)
    p.line([(20,314),(610,303)],(139,87,64),3)
    neris(p,412,344,1.52,gesture=True)
    inky(p,185,342,.95)
    p.light(279,298,70,(186,149,87))
    receipt(p,274,299,1.63)
    p.rect((272,302,315,305),(142,125,104))
    p.line([(310,198),(310,248)],(131,98,74),3)
    p.poly([(291,245),(327,245),(318,263),(298,263)],(168,121,78))
    p.rect((299,247,317,251),WARM)
    pixeldust(p,28)
    return p.img

def scene_4():
    p=Painter(4104)
    p.rect((0,0,639,359),(22,25,39))
    for y in range(12,360,67):
        for x in range(15,640,84):
            p.rect((x,y,x+79,y+59),(46,40,49),outline=(77,64,64),width=2)
            p.line([(x+6,y+8),(x+22,y+6)],(101,79,74))
    for x in (0,545):bookshelf(p,x,0,96,360)
    p.rect((202,2,449,198),(24,23,36),outline=(90,69,71),width=11)
    p.poly([(223,176),(318,47),(425,176)],(59,67,75))
    p.light(327,141,107,(144,135,122))
    blank_page(p,330,200,1.36)
    inky(p,483,324,.65,back=True)
    p.poly([(48,266),(188,234),(213,301),(80,340)],(83,69,63),outline=(143,109,79),width=2)
    receipt(p,116,286,1.43)
    for i in range(25):
        xx=p.r.randint(77,172);yy=p.r.randint(256,322)
        p.line([(xx,yy),(xx,yy-p.r.randint(4,9))],(91,138,151))
    pixeldust(p,25)
    return p.img

def scene_5():
    p=Painter(4105);basic_library(p,5)
    p.poly([(293,143),(318,142),(299,257),(210,360),(70,360)],(66,87,87))
    p.poly([(334,143),(358,141),(383,270),(574,360),(447,360)],(66,75,79))
    p.line([(319,138),(322,273)],(143,106,78),4)
    p.poly([(301,257),(343,258),(371,360),(260,360)],(52,54,65))
    p.poly([(300,104),(351,99),(351,236),(303,238)],(63,104,117),outline=(143,103,71),width=3)
    for i in range(36):
        xx=p.r.randrange(291,355);yy=p.r.randrange(98,240)
        p.line([(xx,yy),(xx,yy-p.r.randint(4,16))],(115,156,161))
    inky(p,391,365,1.58,back=True)
    receipt(p,164,326,1.64)
    p.light(170,311,43,(175,149,99))
    p.rect((157,316,164,321),(226,194,137))
    pixeldust(p,30)
    return p.img

SCENES=[scene_1,scene_2,scene_3,scene_4,scene_5]

def main():
    originals=ROOT/'docs/story-art-600/artist-master-archive/inky/wave_005'
    art=ROOT/'assets/sprites/story/panels_600/inky'
    web=ROOT/'build/web/assets/sprites/story/panels_600/inky'
    for d in (originals,art,web):d.mkdir(parents=True,exist_ok=True)
    records={}
    for idx,fn in enumerate(SCENES,1):
        im=fn().resize((1280,720),Image.Resampling.NEAREST)
        png=originals/f'wave_005_panel_{idx:02}.png'
        im.save(png,optimize=True)
        wp=art/f'wave_005_panel_{idx:02}.webp'
        im.save(wp,format='WEBP',lossless=True,method=6)
        data=wp.read_bytes()
        (web/wp.name).write_bytes(data)
        if len(data)>300_000:raise ValueError(f'{wp}: too large: {len(data)}')
        records[f'story_inky_wave_005_panel_{idx:02}']=hashlib.sha256(data).hexdigest()
    mp=ROOT/'assets/data/story_art_600_manifest.json'
    manifest=json.loads(mp.read_text(encoding='utf-8'))
    for row in manifest['images']:
        if row['id'] in records:
            row['status']='awaiting_human_review'
            row['human_review']=None
            row['qa']={k:'pending' for k in row['qa']}
            row['source_sha256']=records[row['id']]
            row['web_sha256']=records[row['id']]
    manifest['generated_images']=sum(row['status']!='requested_not_generated' for row in manifest['images'])
    mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if len(set(records.values())) != 5:raise ValueError('Duplicate panel images')
    print(json.dumps(records,indent=2))

if __name__=='__main__':main()
